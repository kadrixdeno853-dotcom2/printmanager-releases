import { useState } from "react";
import { Banknote, Printer, ReceiptText, X } from "lucide-react";
import { BusinessProfile, Customer, Invoice, Payment } from "./lib/desktop";
import CompanyLogo from "./CompanyLogo";

type Props = {
  invoice: Invoice;
  payments: Payment[];
  business: BusinessProfile | null;
  customer?: Customer;
  initialReceipt?: Payment | null;
  onClose: () => void;
  onPay: () => void;
};
const methodName = (value: string) =>
  ({
    cash: "Cash",
    mtn_momo: "MTN Mobile Money",
    airtel_money: "Airtel Money",
    bank_transfer: "Bank transfer",
    card: "Card",
    cheque: "Cheque",
  })[value] ?? value.replaceAll("_", " ");

export default function InvoicePreview({
  invoice,
  payments,
  business,
  customer,
  initialReceipt = null,
  onClose,
  onPay,
}: Props) {
  const [receipt, setReceipt] = useState<Payment | null>(initialReceipt);
  return (
    <div className="document-backdrop">
      <div className="document-shell">
        <div className="document-toolbar">
          <div>
            <button onClick={receipt ? () => setReceipt(null) : onClose}>
              <X size={17} /> {receipt ? "Back to invoice" : "Close"}
            </button>
          </div>
          <div>
            {!receipt && invoice.balance > 0 && (
              <button className="job-button" onClick={onPay}>
                <Banknote size={16} /> Record payment
              </button>
            )}
            <button className="print-button" onClick={() => window.print()}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>
        {receipt ? (
          <ReceiptDocument
            payment={receipt}
            invoice={invoice}
            business={business}
            customer={customer}
          />
        ) : (
          <div className="print-document invoice-document">
            <header>
              <CompanyLogo />
              <div>
                <h1>{business?.businessName ?? "PrintAcad Business"}</h1>
                <p>{business?.address}</p>
                <p>
                  {business?.phone}
                  {business?.email ? `  ${business.email}` : ""}
                </p>
                {business?.tin && <p>TIN: {business.tin}</p>}
              </div>
              <aside>
                <span>INVOICE</span>
                <strong>{invoice.invoiceNumber}</strong>
                <i className={`invoice-status ${invoice.status}`}>
                  {invoice.status.replace("_", " ")}
                </i>
              </aside>
            </header>
            <section className="document-meta">
              <div>
                <small>BILL TO</small>
                <strong>{invoice.customerName ?? "Walk-in customer"}</strong>
                <span>{customer?.company}</span>
                <span>{customer?.phone}</span>
                <span>{customer?.email}</span>
              </div>
              <div>
                <p>
                  <small>Issue date</small>
                  <strong>{invoice.issueDate}</strong>
                </p>
                <p>
                  <small>Payment due</small>
                  <strong>{invoice.dueDate}</strong>
                </p>
              </div>
            </section>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id ?? index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.description}</strong>
                    </td>
                    <td>{item.quantity}</td>
                    <td>UGX {item.unitPrice.toLocaleString("en-UG")}</td>
                    <td>UGX {item.total.toLocaleString("en-UG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <section className="document-bottom">
              <div>
                {invoice.notes && (
                  <>
                    <small>NOTES</small>
                    <p>{invoice.notes}</p>
                  </>
                )}
                <small>PAYMENT HISTORY</small>
                {payments.length === 0 ? (
                  <p>No payments recorded.</p>
                ) : (
                  <div className="document-payments">
                    {payments.map((payment) => (
                      <button
                        key={payment.id}
                        onClick={() => setReceipt(payment)}
                      >
                        <span>
                          <strong>{payment.receiptNumber}</strong>
                          <small>{payment.paidAt.replace("T", " ")}</small>
                        </span>
                        <span>{methodName(payment.paymentMethod)}</span>
                        <strong>
                          UGX {payment.amount.toLocaleString("en-UG")}
                        </strong>
                        <ReceiptText size={13} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p>
                  <span>Subtotal</span>
                  <strong>
                    UGX {invoice.subtotal.toLocaleString("en-UG")}
                  </strong>
                </p>
                {invoice.discount > 0 && (
                  <p>
                    <span>Discount</span>
                    <strong>
                       UGX {invoice.discount.toLocaleString("en-UG")}
                    </strong>
                  </p>
                )}
                {invoice.tax > 0 && (
                  <p>
                    <span>Tax</span>
                    <strong>UGX {invoice.tax.toLocaleString("en-UG")}</strong>
                  </p>
                )}
                <p>
                  <span>Total paid</span>
                  <strong>
                    UGX {invoice.amountPaid.toLocaleString("en-UG")}
                  </strong>
                </p>
                <footer>
                  <span>Balance due</span>
                  <strong>UGX {invoice.balance.toLocaleString("en-UG")}</strong>
                </footer>
              </div>
            </section>
            <footer className="document-footer">
              <span>Thank you for your business.</span>
              <span>Generated for {business?.businessName ?? "your business"}</span>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptDocument({
  payment,
  invoice,
  business,
  customer,
}: {
  payment: Payment;
  invoice: Invoice;
  business: BusinessProfile | null;
  customer?: Customer;
}) {
  const balanceAfter = invoice.balance;
  return (
    <div className="print-document receipt-document">
      <header>
        <CompanyLogo />
        <div>
          <h1>{business?.businessName ?? "PrintAcad Business"}</h1>
          <p>{business?.address}</p>
          <p>{business?.phone}</p>
        </div>
        <aside>
          <span>PAYMENT RECEIPT</span>
          <strong>{payment.receiptNumber}</strong>
        </aside>
      </header>
      <div className="receipt-paid">
        <span>AMOUNT RECEIVED</span>
        <strong>UGX {payment.amount.toLocaleString("en-UG")}</strong>
        <i>Payment received successfully</i>
      </div>
      <section className="receipt-details">
        <p>
          <span>Received from</span>
          <strong>
            {invoice.customerName ?? customer?.name ?? "Walk-in customer"}
          </strong>
        </p>
        <p>
          <span>Invoice</span>
          <strong>{invoice.invoiceNumber}</strong>
        </p>
        <p>
          <span>Date and time</span>
          <strong>{payment.paidAt.replace("T", " ")}</strong>
        </p>
        <p>
          <span>Payment method</span>
          <strong>{methodName(payment.paymentMethod)}</strong>
        </p>
        {payment.reference && (
          <p>
            <span>Reference</span>
            <strong>{payment.reference}</strong>
          </p>
        )}
        <p>
          <span>Invoice total</span>
          <strong>UGX {invoice.total.toLocaleString("en-UG")}</strong>
        </p>
        <p>
          <span>Balance remaining</span>
          <strong>UGX {balanceAfter.toLocaleString("en-UG")}</strong>
        </p>
      </section>
      {payment.notes && (
        <section className="receipt-notes">
          <small>NOTES</small>
          <p>{payment.notes}</p>
        </section>
      )}
      <footer className="document-footer">
        <span>Thank you for your payment.</span>
        <span>Generated for {business?.businessName ?? "your business"}</span>
      </footer>
    </div>
  );
}
