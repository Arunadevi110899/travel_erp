frappe.ui.form.on("Travel Package", {
  refresh(frm) {

    // ✅ Show button only when Travel Package is Submitted (docstatus = 1)
    if (frm.doc.docstatus !== 1) return;

    frm.add_custom_button(__("Create CRM Lead (Portal)"), () => {

      // ensure CRM Lead meta is loaded, then detect fields reliably
      frappe.model.with_doctype("CRM Lead", () => {
        const meta = frappe.get_meta("CRM Lead") || {};
        const fields = meta.fields || [];

        const has_field = (fn) => fields.some(f => f.fieldname === fn);
        const pick = (cands) => {
          for (let i = 0; i < cands.length; i++) {
            if (has_field(cands[i])) return cands[i];
          }
          return null;
        };

        const FN_PERSON = pick(["first_name", "lead_name", "person_name"]);
        const FN_MOBILE = pick(["mobile_no", "mobile", "phone", "phone_no"]);
        const FN_ORG    = pick(["organization", "organization_name", "company_name"]);

        const d = new frappe.ui.Dialog({
          title: __("Create CRM Lead"),
          fields: [
            {
              fieldtype: "Data",
              fieldname: "first_name",
              label: __("First Name"),
              reqd: 1
            },
            {
              fieldtype: "Data",
              fieldname: "mobile_no",
              label: __("Mobile No"),
            },
            {
              fieldtype: "Data",
              fieldname: "organization",
              label: __("Organization (optional)"),
            }
          ],
          primary_action_label: __("Create & Open Portal"),
          primary_action(values) {
            const first_name = (values.first_name || "").trim();
            const mobile_no = (values.mobile_no || "").trim();
            const organization = (values.organization || "").trim();

            if (!first_name) {
              frappe.msgprint(__("First Name is required"));
              return;
            }

            const doc = {
              doctype: "CRM Lead",
              custom_travel_package: frm.doc.name
            };

            // Set person name
            if (FN_PERSON) {
              doc[FN_PERSON] = first_name;
            }

            // Set mobile
            if (mobile_no && FN_MOBILE) {
              doc[FN_MOBILE] = mobile_no;
            }

            // Set organization (optional)
            if (organization && FN_ORG) {
              doc[FN_ORG] = organization;
            }

            if (!FN_PERSON && FN_ORG && !doc[FN_ORG]) {
              doc[FN_ORG] = first_name;
            }

            frappe.call({
              method: "frappe.client.insert",
              args: { doc },
              callback: (r) => {
                const created = r && r.message ? r.message : null;
                if (!created || !created.name) {
                  frappe.msgprint(__("Could not create CRM Lead"));
                  return;
                }

                d.hide();

                // ✅ Redirect to CRM PORTAL lead page
                const portal_url = window.location.origin + "/crm/leads/" + created.name;
                window.location.href = portal_url;
              }
            });
          }
        });

        d.show();
      });
    }, __("CRM"));
  }
});
