use uint::construct_uint;
construct_uint! { pub struct U256(4); }

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    Invalid,
    Overflow,
    Time,
}
pub fn mul_div(a: u128, b: u128, d: u128) -> Result<u128, Error> {
    if d == 0 {
        return Err(Error::Invalid);
    }
    let n = U256::from(a)
        .checked_mul(U256::from(b))
        .ok_or(Error::Overflow)?
        / U256::from(d);
    if n > U256::from(u128::MAX) {
        return Err(Error::Overflow);
    }
    Ok(n.as_u128())
}
/// Fee stays in the input reserve; integer rounding favors the pool.
pub fn swap(input: u128, output: u128, amount: u128, minimum: u128) -> Result<u128, Error> {
    if input == 0 || output == 0 || amount == 0 {
        return Err(Error::Invalid);
    }
    input.checked_add(amount).ok_or(Error::Overflow)?;
    let net = U256::from(amount)
        .checked_mul(U256::from(9970))
        .ok_or(Error::Overflow)?;
    let denominator = U256::from(input)
        .checked_mul(U256::from(10000))
        .and_then(|v| v.checked_add(net))
        .ok_or(Error::Overflow)?;
    let result = net.checked_mul(U256::from(output)).ok_or(Error::Overflow)? / denominator;
    let result = result.as_u128();
    if result == 0 || result < minimum || result >= output {
        return Err(Error::Invalid);
    }
    Ok(result)
}

#[derive(Clone, borsh::BorshSerialize, borsh::BorshDeserialize)]
pub struct Oracle {
    start: u64,
    end: u64,
    last: u64,
    price: [u128; 2],
    integral: [U256; 2],
}
impl Oracle {
    pub fn new(start: u64, duration: u64, price: [u128; 2]) -> Result<Self, Error> {
        if duration == 0 || price.contains(&0) {
            return Err(Error::Invalid);
        }
        Ok(Self {
            start,
            end: start.checked_add(duration).ok_or(Error::Overflow)?,
            last: start,
            price,
            integral: [U256::zero(); 2],
        })
    }
    pub fn observe(&mut self, now: u64) -> Result<(), Error> {
        if now < self.last {
            return Err(Error::Time);
        }
        let capped = now.min(self.end);
        let dt = capped - self.last;
        let mut next = self.integral;
        for (i, value) in next.iter_mut().enumerate() {
            *value = value
                .checked_add(
                    U256::from(self.price[i])
                        .checked_mul(U256::from(dt))
                        .ok_or(Error::Overflow)?,
                )
                .ok_or(Error::Overflow)?;
        }
        self.integral = next;
        self.last = capped;
        Ok(())
    }
    pub fn change(&mut self, now: u64, price: [u128; 2]) -> Result<(), Error> {
        if now >= self.end || price.contains(&0) {
            return Err(Error::Invalid);
        }
        self.observe(now)?;
        self.price = price;
        Ok(())
    }
    pub fn outcome(&mut self, now: u64) -> Result<bool, Error> {
        if now < self.end {
            return Err(Error::Time);
        }
        self.observe(now)?;
        debug_assert!(self.end > self.start);
        Ok(self.integral[0]
            .checked_mul(U256::from(100))
            .ok_or(Error::Overflow)?
            > self.integral[1]
                .checked_mul(U256::from(103))
                .ok_or(Error::Overflow)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn checked_extremes() {
        assert_eq!(mul_div(u128::MAX, u128::MAX, u128::MAX), Ok(u128::MAX));
        assert_eq!(mul_div(u128::MAX, 2, 1), Err(Error::Overflow));
        assert_eq!(mul_div(1, 1, 0), Err(Error::Invalid));
        assert_eq!(swap(u128::MAX, 100, 1, 0), Err(Error::Overflow));
    }
    #[test]
    fn swaps_preserve_product_and_slippage() {
        for x in [1u128, 100, 10u128.pow(24)] {
            for y in [100u128, 10000, 10u128.pow(24)] {
                for a in [1u128, 9, 1000] {
                    if let Ok(out) = swap(x, y, a, 0) {
                        assert!(
                            U256::from(x + a) * U256::from(y - out)
                                >= U256::from(x) * U256::from(y)
                        );
                        assert_eq!(swap(x, y, a, out + 1), Err(Error::Invalid));
                    }
                }
            }
        }
    }
    #[test]
    fn no_trades_late_first_crank_and_equality_reject() {
        assert!(
            !Oracle::new(10, 600, [100, 100])
                .unwrap()
                .outcome(10000)
                .unwrap()
        );
        assert!(
            !Oracle::new(10, 600, [103, 100])
                .unwrap()
                .outcome(610)
                .unwrap()
        );
        assert!(
            Oracle::new(10, 600, [104, 100])
                .unwrap()
                .outcome(610)
                .unwrap()
        );
    }
    #[test]
    fn previous_price_and_same_timestamp() {
        let mut o = Oracle::new(0, 600, [100, 100]).unwrap();
        o.change(300, [110, 100]).unwrap();
        o.change(300, [108, 100]).unwrap();
        assert!(o.outcome(600).unwrap());
        assert_eq!(o.integral, [U256::from(62400), U256::from(60000)]);
    }
    #[test]
    fn sparse_and_frequent_cranks_identical() {
        let mut a = Oracle::new(0, 600, [100, 100]).unwrap();
        let mut b = Oracle::new(0, 600, [100, 100]).unwrap();
        for t in 1..300 {
            b.observe(t).unwrap();
        }
        a.change(300, [110, 100]).unwrap();
        b.change(300, [110, 100]).unwrap();
        for t in 301..600 {
            b.observe(t).unwrap();
        }
        assert_eq!(a.outcome(900), b.outcome(600));
        assert_eq!(a.integral, b.integral);
    }
    #[test]
    fn final_second_fixture_and_sustained_attack_limit() {
        let mut late = Oracle::new(0, 600, [100, 100]).unwrap();
        late.change(599, [200, 100]).unwrap();
        assert!(!late.outcome(600).unwrap());
        let mut sustained = Oracle::new(0, 600, [100, 100]).unwrap();
        sustained.change(300, [200, 100]).unwrap();
        assert!(sustained.outcome(600).unwrap());
    }
    #[test]
    fn extreme_last_second_attack_can_pass() {
        let mut o = Oracle::new(0, 600, [100, 100]).unwrap();
        o.change(599, [10_000, 100]).unwrap();
        assert!(o.outcome(600).unwrap());
    }
    #[test]
    fn boundaries() {
        let mut o = Oracle::new(10, 600, [100, 100]).unwrap();
        assert_eq!(o.observe(9), Err(Error::Time));
        assert_eq!(o.outcome(609), Err(Error::Time));
        assert_eq!(o.change(610, [200, 100]), Err(Error::Invalid));
        assert_eq!(o.change(20, [0, 100]), Err(Error::Invalid));
    }
}

/// Separate buckets for one underlying asset, including in-flight obligations.
#[derive(Clone, Debug, Default, PartialEq, Eq, borsh::BorshSerialize, borsh::BorshDeserialize)]
pub struct Ledger {
    pub treasury: u128,
    pub reserved: u128,
    pub collateral: u128,
    pub pass: u128,
    pub fail: u128,
    pub outgoing: u128,
}
impl Ledger {
    pub fn accounted(&self) -> Result<u128, Error> {
        self.treasury
            .checked_add(self.reserved)
            .and_then(|n| n.checked_add(self.collateral))
            .and_then(|n| n.checked_add(self.outgoing))
            .ok_or(Error::Overflow)
    }
    pub fn reserve(&mut self, amount: u128) -> Result<(), Error> {
        let available = self.treasury.checked_sub(amount).ok_or(Error::Invalid)?;
        let reserved = self.reserved.checked_add(amount).ok_or(Error::Overflow)?;
        self.treasury = available;
        self.reserved = reserved;
        Ok(())
    }
    pub fn split(&mut self, amount: u128) -> Result<(), Error> {
        let collateral = self.collateral.checked_add(amount).ok_or(Error::Overflow)?;
        let pass = self.pass.checked_add(amount).ok_or(Error::Overflow)?;
        let fail = self.fail.checked_add(amount).ok_or(Error::Overflow)?;
        self.collateral = collateral;
        self.pass = pass;
        self.fail = fail;
        Ok(())
    }
    /// Caller must first debit the holder's equal pair. Keep backing in outgoing until callback.
    pub fn merge_pending(&mut self, amount: u128) -> Result<(), Error> {
        let collateral = self.collateral.checked_sub(amount).ok_or(Error::Invalid)?;
        let pass = self.pass.checked_sub(amount).ok_or(Error::Invalid)?;
        let fail = self.fail.checked_sub(amount).ok_or(Error::Invalid)?;
        let outgoing = self.outgoing.checked_add(amount).ok_or(Error::Overflow)?;
        self.collateral = collateral;
        self.pass = pass;
        self.fail = fail;
        self.outgoing = outgoing;
        Ok(())
    }
    /// Private, unique-operation callback must gate this transition. It restores claims on failure.
    pub fn merge_complete(&mut self, amount: u128, success: bool) -> Result<(), Error> {
        let outgoing = self.outgoing.checked_sub(amount).ok_or(Error::Invalid)?;
        if !success {
            self.split(amount)?;
        }
        self.outgoing = outgoing;
        Ok(())
    }
}
#[cfg(test)]
mod accounting_tests {
    use super::*;
    #[test]
    fn reservation_cannot_spend_collateral() {
        let mut l = Ledger {
            treasury: 100,
            ..Ledger::default()
        };
        l.split(200).unwrap();
        assert_eq!(l.reserve(101), Err(Error::Invalid));
        l.reserve(80).unwrap();
        assert_eq!(l.accounted(), Ok(300));
        assert_eq!(l.treasury, 20);
        assert_eq!((l.collateral, l.pass, l.fail), (200, 200, 200));
    }
    #[test]
    fn failed_merge_restores_backing_and_supplies() {
        let mut l = Ledger::default();
        l.split(100).unwrap();
        let before = l.clone();
        l.merge_pending(40).unwrap();
        assert_eq!(l.accounted(), Ok(100));
        assert_eq!((l.pass, l.fail, l.collateral), (60, 60, 60));
        l.merge_complete(40, false).unwrap();
        assert_eq!(l, before);
        l.merge_pending(40).unwrap();
        l.merge_complete(40, true).unwrap();
        assert_eq!(l.accounted(), Ok(60));
        assert_eq!(l.merge_complete(40, false), Err(Error::Invalid));
    }
    #[test]
    fn arithmetic_errors_leave_ledger_unchanged() {
        let mut l = Ledger {
            collateral: 1,
            pass: u128::MAX,
            ..Ledger::default()
        };
        let before = l.clone();
        assert_eq!(l.split(1), Err(Error::Overflow));
        assert_eq!(l, before);
    }
}

impl borsh::BorshSerialize for U256 {
    fn serialize<W: borsh::io::Write>(&self, writer: &mut W) -> borsh::io::Result<()> {
        borsh::BorshSerialize::serialize(&self.0, writer)
    }
}
impl borsh::BorshDeserialize for U256 {
    fn deserialize_reader<R: borsh::io::Read>(reader: &mut R) -> borsh::io::Result<Self> {
        Ok(Self(
            <[u64; 4] as borsh::BorshDeserialize>::deserialize_reader(reader)?,
        ))
    }
}
