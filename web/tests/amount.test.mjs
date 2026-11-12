import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAmount,quote,UNIT} from '../src/amount.ts';
test('18-decimal strings retain smallest units without floating point',()=>{
 assert.equal(parseAmount('0.000000000000000001'),'1');
 assert.equal(parseAmount('123456789.123456789123456789'),'123456789123456789123456789');
 for(const s of ['0','-1','1e18','01','1.0000000000000000001','NaN','Infinity','340282366920938463464'])assert.throws(()=>parseAmount(s));
});
test('quoted output includes fee and preserves product',()=>{
 for(const x of [1n,100n,UNIT])for(const y of [100n,10000n,UNIT])for(const a of [1n,9n,1000n]){
  const out=BigInt(quote(x.toString(),y.toString(),a.toString()));
  assert.ok((x+a)*(y-out)>=x*y);assert.ok(out<y);
 }
 assert.equal(quote('1000','1000','100'),'90');
});
