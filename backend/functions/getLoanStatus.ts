// Veridian Bank — Backend Function: getLoanStatus
// Returns all loans for a customer with EMI schedule

import { base44 } from '@base44/sdk';

export default async function getLoanStatus(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const customerId = url.searchParams.get('customer_id');

  if (!customerId) {
    return Response.json({ error: 'customer_id is required' }, { status: 400 });
  }

  try {
    const loans = await base44.asServiceRole.entities.Loan.filter({ customer_id: customerId });

    const enriched = loans.map(loan => ({
      ...loan,
      months_remaining: loan.tenure_months
        ? Math.ceil(loan.outstanding_amount / loan.emi_amount)
        : null,
      is_overdue: loan.status === 'Active' && loan.outstanding_amount > 0,
      completion_percentage: loan.loan_amount
        ? Math.round(((loan.loan_amount - loan.outstanding_amount) / loan.loan_amount) * 100)
        : 0
    }));

    return Response.json({
      success: true,
      customer_id: customerId,
      total_loans: loans.length,
      active_loans: loans.filter(l => l.status === 'Active').length,
      total_outstanding: loans.reduce((sum, l) => sum + (l.outstanding_amount || 0), 0),
      loans: enriched
    });

  } catch (err) {
    return Response.json({ error: 'Failed to fetch loans', details: err.message }, { status: 500 });
  }
}
