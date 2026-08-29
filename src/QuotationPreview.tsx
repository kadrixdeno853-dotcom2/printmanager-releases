import { BriefcaseBusiness, CheckCircle2, Printer, X } from "lucide-react";
import { BusinessProfile, Customer, Quotation } from "./lib/desktop";
import CompanyLogo from "./CompanyLogo";

type Props = {
  quotation: Quotation;
  business: BusinessProfile | null;
  customers: Customer[];
  message: string;
  onClose: () => void;
  onStatus: (status: string) => void;
  onCreateJob: () => void;
  onDismissMessage: () => void;
};

export default function QuotationPreview({
  quotation,
  business,
  customers,
  message,
  onClose,
  onStatus,
  onCreateJob,
  onDismissMessage,
}: Props) {
  const customer = customers.find((item) => item.id === quotation.customerId);
  return (
    <div className="document-backdrop">
      <div className="document-shell">
        <div className="document-toolbar">
          <div>
            <button onClick={onClose}>
              <X size={17} /> Close
            </button>
            <select
              value={quotation.status}
              onChange={(event) => onStatus(event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            {quotation.status === "accepted" && (
              <button className="job-button" onClick={onCreateJob}>
                <BriefcaseBusiness size={16} /> Create print job
              </button>
            )}
            <button className="print-button" onClick={() => window.print()}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>
        {message && (
          <div className="conversion-message">
            <CheckCircle2 size={16} />
            {message}
            <button onClick={onDismissMessage}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="print-document">
          <header>
          <CompanyLogo />
            <div>
              <h1>{business?.businessName ?? "PrintManager Business"}</h1>
              <p>{business?.address}</p>
              <p>
                {business?.phone}
                {business?.email ? `  ${business.email}` : ""}
              </p>
              {business?.tin && <p>TIN: {business.tin}</p>}
            </div>
            <aside>
              <span>QUOTATION</span>
              <strong>{quotation.quotationNumber}</strong>
              <i className={`quote-status ${quotation.status}`}>
                {quotation.status}
              </i>
            </aside>
          </header>
          <section className="document-meta">
            <div>
              <small>QUOTATION FOR</small>
              <strong>{quotation.customerName ?? "Walk-in customer"}</strong>
              <span>{customer?.company}</span>
              <span>{customer?.phone}</span>
            </div>
            <div>
              <p>
                <small>Issue date</small>
                <strong>{quotation.issueDate}</strong>
              </p>
              <p>
                <small>Valid until</small>
                <strong>{quotation.validUntil}</strong>
              </p>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Dimensions / unit</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, index) => (
                <tr key={item.id ?? index}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.description}</strong>
                  </td>
                  <td>
                    {item.width && item.height
                      ? `${item.width}m  ${item.height}m`
                      : item.unit.replaceAll("_", " ")}
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
              {quotation.notes && (
                <>
                  <small>NOTES</small>
                  <p>{quotation.notes}</p>
                </>
              )}
              <small>TERMS</small>
              <p>{quotation.terms}</p>
            </div>
            <div>
              <p>
                <span>Subtotal</span>
                <strong>
                  UGX {quotation.subtotal.toLocaleString("en-UG")}
                </strong>
              </p>
              {quotation.discount > 0 && (
                <p>
                  <span>Discount</span>
                  <strong>
                     UGX {quotation.discount.toLocaleString("en-UG")}
                  </strong>
                </p>
              )}
              {quotation.tax > 0 && (
                <p>
                  <span>Tax</span>
                  <strong>UGX {quotation.tax.toLocaleString("en-UG")}</strong>
                </p>
              )}
              <footer>
                <span>Total</span>
                <strong>UGX {quotation.total.toLocaleString("en-UG")}</strong>
              </footer>
            </div>
          </section>
          <footer className="document-footer">
            <span>Thank you for the opportunity to serve you.</span>
          <span>Generated for {business?.businessName ?? "your business"}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
