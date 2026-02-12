frappe.ui.form.on("Itinerary", {
  package(frm) {
    if (!frm.doc.package) return;
    fetch_package_into_itinerary_plans(frm);
  }
});

async function fetch_package_into_itinerary_plans(frm) {
  // Clear tables
  frm.clear_table("activity_plan");
  frm.clear_table("hotel_paln");
  frm.clear_table("transportation_plan");
  frm.refresh_fields(["activity_plan", "hotel_paln", "transportation_plan"]);

  const r = await frappe.call({
    method: "frappe.client.get",
    args: {
      doctype: "Travel Package",
      name: frm.doc.package
    }
  });

  const pkg = (r && r.message) ? r.message : null;
  if (!pkg) return;

  // =========================
  // 1) Package Activity -> Activity Plan (Day BLANK)
  // =========================
  (pkg.package_activity || []).forEach(src => {
    const row = frm.add_child("activity_plan");
    frappe.model.set_value(row.doctype, row.name, "activity", src.activity || "");
    frappe.model.set_value(row.doctype, row.name, "day", null);
    if ("description" in row) frappe.model.set_value(row.doctype, row.name, "description", "");
  });

  // =========================
  // 2) Package Accommodation -> Hotel Plan (From Night + To Night BLANK)
  // =========================
  (pkg.package_accomadation || []).forEach(src => {
    const row = frm.add_child("hotel_paln");
    frappe.model.set_value(row.doctype, row.name, "hotel", src.hotel || "");
    frappe.model.set_value(row.doctype, row.name, "type", src.type || "");
    frappe.model.set_value(row.doctype, row.name, "day", null);        // From Night fieldname = day
    frappe.model.set_value(row.doctype, row.name, "to_night", null);
    if ("description" in row) frappe.model.set_value(row.doctype, row.name, "description", src.address || "");
  });

  // =========================
  // 3) Package Transportation -> Transportation Plan
  // Travel Package table fieldname: transportation
  // Package row supplier fieldname: transportor
  // Itinerary Day Transport supplier fieldname: transport
  // Day BLANK
  // =========================
  (pkg.transportation || []).forEach(src => {
    const row = frm.add_child("transportation_plan");

    // ✅ This is the main fix
    frappe.model.set_value(row.doctype, row.name, "transport", src.transportor || "");

    // leave day blank
    frappe.model.set_value(row.doctype, row.name, "day", null);

    if ("description" in row) frappe.model.set_value(row.doctype, row.name, "description", "");
  });

  frm.refresh_fields(["activity_plan", "hotel_paln", "transportation_plan"]);
  frappe.show_alert({ message: "Activity + Hotel + Transport fetched.", indicator: "green" });
}
