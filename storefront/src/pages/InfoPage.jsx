const content = {
  contact: ['Contact us', 'Need product or order help?', 'Call or message the Fitness Factory team during store hours. Online contact details will be published before launch.'],
  faq: ['Frequently asked questions', 'Clear answers before you order.', 'Find help with product selection, payments, delivery and returns. Full answers will be finalised with the store policies before launch.'],
  delivery: ['Delivery', 'Islandwide delivery in Sri Lanka.', 'Delivery timing, charges and service areas are being finalised. The confirmed policy will appear here before checkout is enabled.'],
  returns: ['Returns', 'A fair, clear returns process.', 'Return eligibility and time limits are being finalised. Sealed consumable products may require special conditions for hygiene and safety.'],
  privacy: ['Privacy', 'Your data deserves careful handling.', 'The final policy will explain what customer data is collected, why it is needed, how long it is retained and how to request access or deletion.'],
  terms: ['Terms and conditions', 'Simple terms for shopping with us.', 'Final sales, payment, fulfilment and website terms will be published before customer orders are accepted.'],
};
export default function InfoPage({ type }) { const [title, lead, body] = content[type] || content.faq; return <section className="page section-pad narrow"><p className="eyebrow">Support</p><h1>{title}</h1><h2>{lead}</h2><p>{body}</p><div className="policy-note"><b>Pre-launch policy notice</b><p>This page is intentionally marked as provisional so placeholder terms cannot be mistaken for the store’s final legal or delivery policy.</p></div></section>; }
