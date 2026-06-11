// Veridian Bank — Backend Function: createTransaction
// Creates a new transaction and updates account balance
// Deploy via: Base44 Backend Functions

import { base44 } from '@base44/sdk';

export default async function createTransaction(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json();
  const {
    customer_id,
    account_number,
    transaction_type,
    amount,
    recipient_account,
    recipient_name,
    transfer_mode,
    description,
    initiated_from
  } = body;

  // Validate required fields
  if (!customer_id || !account_number || !transaction_type || !amount) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (amount <= 0) {
    return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  try {
    // Fetch customer
    const customers = await base44.asServiceRole.entities.Customer.filter({ customer_id });
    if (!customers.length) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }
    const customer = customers[0];

    // Check balance for debit transactions
    const debitTypes = ['Debit', 'Transfer', 'Bill Payment', 'EMI', 'Withdrawal'];
    if (debitTypes.includes(transaction_type) && customer.balance < amount) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Calculate new balance
    const creditTypes = ['Credit', 'Deposit'];
    const newBalance = creditTypes.includes(transaction_type)
      ? customer.balance + amount
      : customer.balance - amount;

    // Generate transaction ID
    const txnId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const refNumber = `REF${Date.now()}`;

    // Create transaction record
    const transaction = await base44.asServiceRole.entities.Transaction.create({
      transaction_id: txnId,
      customer_id,
      account_number,
      transaction_type,
      amount,
      balance_after: newBalance,
      recipient_account: recipient_account || null,
      recipient_name: recipient_name || null,
      transfer_mode: transfer_mode || 'Internal',
      description: description || `${transaction_type} - ${account_number}`,
      reference_number: refNumber,
      status: 'Success',
      initiated_from: initiated_from || 'Web',
      processing_fee: 0
    });

    // Update customer balance
    await base44.asServiceRole.entities.Customer.update(customer.id, {
      balance: newBalance
    });

    return Response.json({
      success: true,
      transaction_id: txnId,
      reference_number: refNumber,
      new_balance: newBalance,
      status: 'Success'
    });

  } catch (err) {
    return Response.json({ error: 'Transaction failed', details: err.message }, { status: 500 });
  }
}
