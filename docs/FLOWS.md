## Flows
### Table of Contents
- [ETF Trade](#etf-trade)
- [ETF Fail](#etf-fail)
- [Trade Lifecycle](#trade-lifecycle)
  - [Buy](#buy)
  - [Sell](#sell)
  - [ETF Creation](#etf-creation)
  - [ETF Redemption](#etf-redemption)

## ETF Trade

1. AP sends basket to HTLC
2. ETF sends shares to HTLC
3. Reveal secret
4. HTLC -> ETF shares to AP
5. HTLC -> Basket to ETF

## ETF Fail

1. AP sends basket to HTLC
2. ETF sends shares to HTLC
3. T+1 fail
4. HTLC -> ETF shares to ETF
5. HTLC -> AP basket to AP

## Trade Lifecycle

1. Trade Initiation
2. Trade Execution
3. Trade Capture
4. Trade Enrichment
5. Trade Validation
6. Trade Verification
7. Trade Allocation
8. Trade Agreement
9. Trade Affirmation
10. Trade Confirmation
11. Clearing
12. Settlement
13. Reconciliation
14. Trade Reporting

### Buy

1. User sends EUR to Robinhood
2. Robinhood swaps EUR to USD
3. Robinhood buys shares
4. Robinhood mints token to User wallet

### Sell

1. User sends token to Robinhood
2. Robinhood sells AAPL share
3. Robinhood swaps USD to EUR
4. Robinhood sends EUR to User
5. Robinhood burns tokens


### ETF Creation

1. AP buys creation basket of ETF’s underlying securities
2. AP delivers creation basket of securities to ETF
3. AP receives ETF’s underlying securities
4. AP sells ETF’s underlying securities

### ETF Redemption

1. AP buys ETF shares from market
2. AP delivers ETF shares to the fund
3. AP receives new ETF shares
4. AP sells ETF shares in market


<details>
<summary>ETF Creation</summary>

1. AP buys creation basket of ETF's underlying securities
2. AP delivers creation basket of securities to ETF
3. AP receives ETF's underlying securities
4. AP sells ETF's underlying securities

</details>

<details>
<summary>ETF Redemption</summary>

1. AP buys ETF shares from market
2. AP delivers ETF shares to the fund
3. AP receives new ETF shares
4. AP sells ETF shares in market

</details>

<details>
<summary>Credit Transfer</summary>
1. Alice sends a request to Bank A “Pay Bank B $5 for the benefit of Bob”
2. Bank A verifies Alice’s identity and adequacy of Alice’s funds
3. Bank A notifies Bank B of the payment
4. Bank B verifies Bob has an account
5. Bank B sends confirmation to Bank A
6. Both banks send confirmation to their respective customers.

</details>

<details>
<summary>ACH Data</summary>
1. Originator initiates a debit or credit payment order to the ODFI
2. ODFI transmits the payment information to the ACH operator
3. ACH operator receives data from the ODFI and sorts the entries by routing number
4. ACH operator transmits the entries to the RDFI
5. RDFI receives, processes, and posts the ACH data to the receiver account on settlement day

</details>

<details>
<summary>Wire</summary>
1. **Initiation:** The sender provides their bank with the recipient's name, account number and bank information (such as routing number for domestic transfers and IBAN for international transfers).
2. **Verification:** The sending bank verifies the sender's account balance and transaction details.
3. **Processing:** The sending bank processes the transfer through payment networks such as Fedwire or SWIFT.
4. **Intermediary routing:** Especially for international transfers, the payment may route through intermediary banks that facilitate the transaction between different banking systems.
5. **Funds crediting:** The recipient's bank receives the payment instructions and credits the funds to the specified account.
6. **Notification:** Both sender and recipient receive confirmation of the transfer.
7. **Settlement:** The banks complete the transaction by settling funds between themselves through central banks or clearing houses.

</details>
