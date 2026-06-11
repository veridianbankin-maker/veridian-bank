// Veridian Bank — Backend Function: getCustomer
// Fetches a customer record by account number or customer ID
// Deploy via: Base44 Backend Functions

import { base44 } from '@base44/sdk';

export default async function getCustomer(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const customerId = url.searchParams.get('customer_id');
  const accountNumber = url.searchParams.get('account_number');

  if (!customerId && !accountNumber) {
    return Response.json({ error: 'Provide customer_id or account_number' }, { status: 400 });
  }

  try {
    let customers;
    if (customerId) {
      customers = await base44.asServiceRole.entities.Customer.filter({ customer_id: customerId });
    } else {
      customers = await base44.asServiceRole.entities.Customer.filter({ account_number: accountNumber });
    }

    if (!customers.length) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Remove sensitive fields
    const customer = customers[0];
    delete customer.pin_hash;
    delete customer.aadhaar_number;

    return Response.json({ success: true, customer });
  } catch (err) {
    return Response.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
