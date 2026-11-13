#!/usr/bin/env python3
"""Read-only, fixed-block verification. Never reads credentials or signs transactions."""
import argparse
import base64
import datetime
import json
from pathlib import Path
import urllib.request

RPC = 'https://test.rpc.fastnear.com'
ROOT = Path(__file__).resolve().parent.parent


def rpc(method, params):
    payload = json.dumps({'jsonrpc': '2.0', 'id': 'belief-verification',
                          'method': method, 'params': params}).encode()
    request = urllib.request.Request(RPC, data=payload,
                                     headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    if 'error' in body:
        raise RuntimeError(json.dumps(body['error']))
    return body['result']


def verify(manifest):
    if manifest['network'] != 'testnet':
        raise ValueError('Only testnet manifests are supported')
    accounts = manifest['accounts']
    if not all(isinstance(a, str) and a.endswith('.testnet') for a in accounts.values()):
        raise ValueError('Every account must be a named testnet account')
    status = rpc('status', [])
    if status['chain_id'] != 'testnet':
        raise ValueError('RPC did not report testnet')
    header = rpc('block', {'finality': 'final'})['header']
    block_hash = header['hash']

    def query(account, request_type, **extra):
        return rpc('query', {'request_type': request_type, 'account_id': account,
                             'block_id': block_hash, **extra})

    def view(account, method, args=None):
        encoded = base64.b64encode(json.dumps(args or {}).encode()).decode()
        result = query(account, 'call_function', method_name=method, args_base64=encoded)
        if 'error' in result:
            raise RuntimeError(result['error'])
        return json.loads(bytes(result['result']))

    expected = json.loads((ROOT / 'docs/BUILD_HASHES.json').read_text())['artifacts']
    contract_accounts = {}
    for role, artifact in [('market', 'futarchy'), ('belief', 'belief_ft'), ('tusd', 'tusd_ft')]:
        state = query(accounts[role], 'view_account')
        if state['code_hash'] != expected[artifact]['near_code_hash']:
            raise ValueError(f'{role} code differs from tested artifact')
        if manifest['code_hashes'][artifact] != state['code_hash']:
            raise ValueError(f'{role} manifest hash mismatch')
        keys = query(accounts[role], 'view_access_key_list')['keys']
        state['access_key_count'] = len(keys)
        state['full_access_key_count'] = sum(k['access_key']['permission'] == 'FullAccess' for k in keys)
        contract_accounts[role] = state
    market = accounts['market']
    config = view(market, 'config')
    if not config['ready'] or config['tokens'] != [accounts['belief'], accounts['tusd']]:
        raise ValueError('Market configuration mismatch or bootstrap incomplete')
    if config['pending_count'] != 0 or any(int(x) for x in config['outgoing']):
        raise ValueError('Snapshot has outgoing receipts in flight; retry after settlement')
    proposals = [view(market, 'proposal', {'proposal_id': i})
                 for i in range(config['proposal_count'])]
    active = [p['id'] for p in proposals if p['outcome'] is None or p['execution'] == 'executing']
    if active != ([] if config['active'] is None else [config['active']]):
        raise ValueError('Active proposal lock is inconsistent')
    totals = [sum(int(config[bucket][a]) for bucket in ['treasury', 'reserved', 'stakes', 'outgoing'])
              for a in range(2)]
    for p in proposals:
        for a in range(2):
            collateral = int(p['collateral'][a])
            totals[a] += collateral
            sides = [0, 1] if p['outcome'] is None else [0 if p['outcome'] else 1]
            if any(int(p['supply'][s][a]) != collateral for s in sides):
                raise ValueError(f'Proposal {p["id"]} claim backing mismatch')
        if p['outcome'] is not None and any(int(x) for row in p['pools'] for x in row):
            raise ValueError('Resolved proposal retained pool reserves')
    tokens = {}
    for a, (role, symbol) in enumerate([('belief', 'BELIEF'), ('tusd', 'tUSD')]):
        token = accounts[role]
        metadata = view(token, 'ft_metadata')
        if metadata['symbol'] != symbol or metadata['decimals'] != 18:
            raise ValueError(f'{role} metadata mismatch')
        physical = int(view(token, 'ft_balance_of', {'account_id': market}))
        if physical != totals[a]:
            raise ValueError(f'{role} physical balance differs from accounted balance')
        tokens[role] = {'metadata': metadata, 'physical_market_balance': str(physical),
                        'accounted_market_balance': str(totals[a]),
                        'total_supply': view(token, 'ft_total_supply'),
                        'wallet_balances': {r: view(token, 'ft_balance_of', {'account_id': accounts[r]})
                                            for r in ['proposer', 'trader', 'recipient']}}
    return {'verified_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'network': 'testnet', 'block_hash': block_hash, 'block_height': header['height'],
            'protocol_version': status['protocol_version'], 'accounts': accounts,
            'contract_accounts': contract_accounts, 'config': config,
            'proposals': proposals, 'tokens': tokens,
            'checks': ['tested code hashes', 'token metadata', 'single active proposal',
                       'claim supply backing', 'resolved reserve release',
                       'physical FT balances equal separate ledgers at one final block']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = verify(json.loads(args.manifest.read_text()))
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
