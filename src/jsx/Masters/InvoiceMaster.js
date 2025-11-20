import React from 'react';

function getValue(data, key) {
  const found = data.find((d) => d.key === key);
  return found ? found.value : '';
}

function InvoiceMaster({
  companyData = [],
  buyerData = [],
  invoiceData = [],
  itemsData = [],
  bankData = [],
  gstRate = 12,
}) {
  // Calculate totals
  const subTotal = itemsData.reduce((sum, item) => sum + (item.amount || 0), 0);
  const gstAmount = (subTotal * gstRate) / 100;
  const total = subTotal + gstAmount;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'Arial, sans-serif', border: '1px solid #ccc', padding: 24 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 0 }}>{getValue(companyData, 'name')}</h2>
      <div style={{ textAlign: 'center', fontSize: 14 }}>{getValue(companyData, 'address')}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '8px 0' }}>
        <div>GSTIN: {getValue(companyData, 'gstin')}</div>
        <div>Mobile: {getValue(companyData, 'mobile')}</div>
      </div>
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <div>
          <b>BUYER</b><br />
          {getValue(buyerData, 'name')}<br />
          {getValue(buyerData, 'address')}
        </div>
        <div>
          <div>Invoice No.: {getValue(invoiceData, 'number')}</div>
          <div>Invoice Date: {getValue(invoiceData, 'date')}</div>
          <div>Challan No.: {getValue(invoiceData, 'challanNo')}</div>
          <div>Challan Date: {getValue(invoiceData, 'challanDate')}</div>
          <div>VEHICLES: {getValue(invoiceData, 'vehicle')}</div>
          <div>P.O. No.: {getValue(invoiceData, 'poNo')}</div>
          <div>GST No: {getValue(invoiceData, 'gstNo')}</div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 13 }} border="1">
        <thead>
          <tr>
            <th>SN</th>
            <th>Style</th>
            <th>Description</th>
            <th>Ply</th>
            <th>Calc</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {itemsData.length === 0 ? (
            <tr><td colSpan="8" style={{ textAlign: 'center' }}>No items</td></tr>
          ) : (
            itemsData.map((item, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{item.style || ''}</td>
                <td>{item.description || ''}</td>
                <td>{item.ply || ''}</td>
                <td>{item.calc || ''}</td>
                <td>{item.qty || ''}</td>
                <td>{item.rate || ''}</td>
                <td>{item.amount?.toFixed(2) || ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <table style={{ minWidth: 250, fontSize: 13 }}>
          <tbody>
            <tr>
              <td>Sub Total</td>
              <td style={{ textAlign: 'right' }}>{subTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>GST @{gstRate}%</td>
              <td style={{ textAlign: 'right' }}>{gstAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td><b>Grand Total</b></td>
              <td style={{ textAlign: 'right' }}><b>{total.toFixed(2)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 24, fontSize: 12 }}>
        <b>Bank Details:</b><br />
        {getValue(bankData, 'name') && <>Bank: {getValue(bankData, 'name')}<br /></>}
        {getValue(bankData, 'account') && <>A/C No.: {getValue(bankData, 'account')}<br /></>}
        {getValue(bankData, 'ifsc') && <>IFSC: {getValue(bankData, 'ifsc')}<br /></>}
      </div>
      <div style={{ marginTop: 16, fontSize: 12 }}>
        <b>Note:</b> This is a system generated invoice.<br />
        <b>For:</b> {getValue(companyData, 'name')}
      </div>
    </div>
  );
}

export default InvoiceMaster;