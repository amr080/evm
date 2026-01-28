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

---

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

<details>
<summary>Correspondent banking</summary>

1. Debiting of payer’s account with bank A
2. Crediting of bank B’s mirror account with bank A, which is kept for accounting purposes
3. Payment message from bank A to bank B via telecommunication network
4. Debiting of bank A’s account with bank B (loro account)

**A. Use correspondent bank only**

5. Crediting of bank C’s account with bank B
6. Payment message from bank B to bank C via telecommunication network
7. Debiting of bank’s B mirror account with bank C, which is kept for accounting purposes
8. Crediting of receiver’s account with bank C

**B. Involvement of payment system**

5. Payment message from bank B to payment system
6. Settlement via payment system
7. Payment message from payment system to bank C
8. Crediting of receiver’s account with bank C

</details>

<details>
<summary>Stablecoin Transfer</summary>

**Authorization**

1. Sender initiates a transfer via their wallet.
2. Transaction is broadcast to the blockchain network.
3. Network verifies sender's balance and transaction validity.
4. Transaction is approved and added to the blockchain.

**Processing**

5. Transaction is processed on the blockchain.
6. Smart contracts execute any required conditions.
7. Network nodes confirm the transaction.

**Settlement**

8. Stablecoin is credited to the recipient's wallet.
9. Transaction is permanently recorded on the blockchain.

</details>

<details>
<summary>MMF Purchase Process</summary>

1. Institutional Client initiates Fedwire for purchase
2. Custodian receives Fedwire in clearing account
3. Global Cash Services creates case upon receipt of wire
4. TA (Transfer Agent) reconciles transaction with wired funds received
5. Treasury/Fund Accounting initiates wire from clearing to fund account
6. Custodian receives wire into fund account

</details>

<details>
<summary>MMF Liquidation Process</summary>

1. TA creates case for outgoing wire
2. Global Cash Services initiates wire to the client
3. Treasury/Fund Accounting initiates wire from fund account to clearing account
4. Custodian fund account wires to clearing account
5. Custodian clearing account wires to client
6. Institutional Client receives wire

</details>

<details>
<summary>Traditional MMF Intercompany Transfer</summary>

1. Unit A initiates MMF redemption
2. Unit A approves MMF redemption
3. MMF redemption settlement (T+0 or T+1)
4. Unit A confirms MMF proceeds landed in bank
5. Unit A initiates MMF payment to Unit B
6. Unit A approves payment to Unit B
7. Unit B receives payment, initiates MMF purchase and associated payment
8. Unit B approves MMF purchase and associated payment
9. Funds arrive at MMF, begin earning interest (T+0 to T+1)

</details>

<details>
<summary>Tokenized MMF Intercompany Transfer</summary>

1. Unit A initiates transfer of MMF tokens to Unit B
2. Unit A approves transfer of MMF tokens to Unit B
3. Funds arrive in Unit B's wallet and start earning yield instantly, with no yield lost during transaction

</details>

<details>
<summary>MMF Funding Engine</summary>

1. Investors deposit cash with the MMF's custodian.
2. The MMF selects and invests in money market securities according to the Investment Policy of the Fund.
3. Purchased securities are held at the MMF's custodian on behalf of the Investors.
4. Returns on the portfolio may either be paid to investors periodically or reinvested in the fund.

</details>


<details>
<summary>Trade Lifecycle</summary>

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
</details>

<details>
<summary>BITNET DIRECT ISSUANCE</summary>

1. Issuer registers offering
2. Investor buys new shares
3. Issuer accepts stablecoins
4. Investor receives tokenized shares
5. DRS updates registry

</details>

<details>
<summary>BITNET PRIMARY & SECONDARY MARKETS</summary>

1. <strong>Issuer registers offering:</strong> Issuer submits standard registration statement to the SEC
2. <strong>Investor buys new shares:</strong> Investor connects wallet, completes KYC, and buys shares
3. <strong>Issuer accepts stablecoins:</strong> Funds settle directly into the issuer’s wallet from KYC-verified investors
4. <strong>Investor receives tokenized shares:</strong> DRS issues tokenized shares instantly into the investor’s wallet
5. <strong>DRS updates registry:</strong> Shareholder records updated in real-time

</details>

<details>
<summary>DRS ISSUANCE</summary>

1. Issuer submits standard registration statement to the SEC
2. Investor connects wallet, completes KYC, and buys shares
3. Stablecoins settle into issuer’s wallet from KYC-verified investors
4. DRS issues tokenized shares to investor wallets
5. Shareholder registry updates programmatically via blockchain

</details>

<details>
<summary>BITNET DIRECT ISSUANCE PROGRAM</summary>

1. Issuers file the standard SEC registration
2. Investors connect wallets and send stablecoins, with pricing referenced to real-time market prices
3. Tokenized shares are issued directly to investor wallets via DRS
4. The shareholder registry updates in real time

</details>





<details>
<summary>PREPAID STABLECOIN DEBIT TRANSFER / PULL</summary>

1. Cardholder authorizes merchant to pull funds
2. Merchant sends debit request
3. Merchant wallet submits blockchain debit request
4. Blockchain verifies card wallet balance
5. Blockchain debits card wallet
6. Blockchain credits merchant wallet
7. Merchant wallet confirms receipt to merchant
</details>


<details>
<summary>PREPAID STABLECOIN CREDIT / TRANSFER / PUSH</summary>

1. Cardholder requests payment
2. Card wallet submits stablecoin transfer
3. Blockchain debits card wallet
4. Blockchain credits merchant wallet
5. Merchant wallet confirms receipt to merchant
6. Merchant provides receipt to cardholder

</details>

<details>
<summary>Minting and redeeming stablecoins</summary>

**MINT**
1. Authenticate
2. Deposit USD
3. Convert USD to Stablecoin
4. Transfer Stablecoin to Customer

**REDEEM**
1. Authenticate
2. Create Deposit Address
3. Send Stablecoin to XFT
4. XFT Transfers USD to Bank Account

</details>



<details>
<summary>VISA DIRECT FOR WALLET</summary>

1. The sender initiates a payment using a visa direct client.
2. The Visa Direct Client processes the payment through the Visa Direct Gateway.
3. The Visa Direct Gateway connects to the Visa Payments Limited (VPL) network.
4. A network of wallet aggregators and operators on the VPL is utilized to facilitate the transaction.
5. The payment is transferred to the recipient's financial institution.

</details>

<details>
<summary>VISA DIRECT USER</summary>

1. Sender initiates payment through a digital channel
2. Create and submit OCT transaction
3. Transaction is routed to recipient institution
4. Receiving institution credits account and notifies recipient
5. Recipient can access funds at POS or ATM

</details>

<details>
<summary>Payments data</summary>

1. Initiation
2. Authorization
3. Transmission
4. Acceptance
5. Receipt

</details>



<details>
<summary>IDN liquidity mechanism</summary>

1. Bank funds IDN wallet
2. Bank adds optional supplemental
3. Bank A pays Bank B
4. XFT debits A credits B
5. Uses supplemental then primary
6. Queues if limits hit
7. End of day net and settle​

</details>



<details>
<summary>MORTGAGE LIFECYCLE</summary>

1. ORIGINATION The lender helps the borrowers complete the loan application.
2. PROCESSING The lender documents the loan file.
3. UNDERWRITING The lender evaluates the loan file.
4. CLOSING The borrowers sign loan documents; the sellers transfer the title.
5. WAREHOUSING The lender may temporarily warehouse closed loans.
6. DELIVERY The lender packages and sends the loan to an investor
7. SECONDARY MARKET Lenders and investors buy and sell mortgages.
8. LOAN SERVICING Third parties collect the borrowers’ monthly mortgage payment.

</details>

<details>
<summary>Mortgage</summary>

1. Origination
2. Processing
3. Underwriting
4. Closing
5. Warehousing
6. Delivery
7. Secondary market
8. Loan servicing

</details>

<details>
<summary>1031 Exchange</summary>

1. Alice deposits 100 22 LIBERTY LN to escrow
2. Escrow mints 100 LGUSD to Alice wallet
3. Bob deposits 100 20 LIBERTY LN to escrow
4. LG Settlement Services approves
5. Atomic settlement:
    - Contract sends 100 22 LIBERTY LN tokens to Bob wallet
    - Contract sends 100 20 LIBERTY LN tokens to Alice wallet
    - Escrow burns 100 LGUSD from Alice wallet

</details>


<details>
<summary>ETF redemption process John</summary>

1. John goes to his broker and gives him the order to sell 500,000 shares of the ETF.
2. The broker buys the ETF shares from John at an agreed-upon price.
3. The broker determines if a redemption is necessary due to the decrease in demand and is now long the ETF since John sold the shares back to him.
4. The broker then sells the basket of securities held by the ETF to hedge his position and is now short the basket, long the ETF.
5. The broker delivers the ETF shares to the ETF issuer, initiating a redemption.
6. The broker receives the basket of securities from the issuer and flattens out the short basket position.

</details>



<details>
<summary>ETF creation process John</summary>

1. John goes to his broker and gives him the order to buy 500,000 shares of an ETF.
2. The broker sells the ETF shares to John at a specific price. As mentioned before, the process of buying the ETF is seamless for John the investor, and his work is done.
3. Behind the scenes on the back end, the broker has determined that, due to the increased demand by John, he as an authorized participant must create new ETF shares. He is now short the ETF shares since he sold them to John.
4. The broker then buys the basket of securities held by the ETF to hedge himself and is now long the basket and short the ETF.
5. The broker then delivers the basket of securities to the ETF issuer, initiating a creation.
6. The broker receives new ETF shares from the issuer in return and flattens out his short ETF position.

</details>

<details>
<summary>Buy stocks</summary>

1. User sends EUR to Robinhood
2. Robinhood swaps EUR to USD
3. Robinhood buys shares
4. Robinhood mints token to User wallet

</details>

<details>
<summary>Sell stocks</summary>

1. User sends token to Robinhood
2. Robinhood sells AAPL share
3. Robinhood swaps USD to EUR
4. Robinhood sends EUR to User
5. Robinhood burns tokens

</details>


<details>
<summary>Withdrawing crypto assets</summary>

1. Whitelist the destination address
2. Verify whitelist approval status
3. Request withdrawal to approved address
4. Monitor withdrawal status

</details>

<details>
<summary>Mint tokenization endpoint</summary>

1. Once the handshake process is completed, the AP is now able to request minting of tokenized assets using the endpoint below.
2. Mint request is validated by DRS and Issuer:
   - DRS validations:
     - Client is an AP authorized for tokenizations
     - AP has enough underlying position to mint
   - Issuer validations:
     - Wallet address provided is registered to the AP
     - Requested token is available on the requested network
3. Upon successful validation of mint request, DRS journals the requested quantity of underlying security from AP's account to Issuer's account
4. DRS confirms with Issuer that underlying security has been journaled
5. Issuer deposits tokenized assets in AP's provided wallet address
6. Issuer informs DRS of successful deposit of tokens in AP's wallet address

</details>



<details>
<summary>Mint tokenization endpoint</summary>

1. Once the handshake process is completed, the AP is now able to request minting of tokenized assets using the endpoint below.
2. Mint request is validated by DRS and Issuer:
   - DRS validations:
     - Client is an AP authorized for tokenizations
     - AP has enough underlying position to mint
   - Issuer validations:
     - Wallet address provided is registered to the AP
     - Requested token is available on the requested network
3. Upon successful validation of mint request, DRS journals the requested quantity of underlying security from AP's account to Issuer's account
4. DRS confirms with Issuer that underlying security has been journaled
5. Issuer deposits tokenized assets in AP's provided wallet address
6. Issuer informs DRS of successful deposit of tokens in AP's wallet address

</details>


<details>
<summary>Redeem tokenization endpoint</summary>

1. AP moves tokens into Issuer's redemption wallet address
2. Issuer removes tokens from circulation
3. Issuer notifies DRS that AP has redeemed tokens
4. DRS journals underlying asset from Issuer's account to AP's account

</details>
