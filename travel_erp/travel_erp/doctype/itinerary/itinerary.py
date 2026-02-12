# Copyright (c) 2026, Techinsights and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Itinerary(Document):
    def validate(self):
        self._sync_from_travel_package()

    def _sync_from_travel_package(self):
        pkg_name = (self.get("package") or "").strip()
        if not pkg_name:
            return

        # Sync only when:
        # - package changed OR
        # - itinerary tables are empty
        old_pkg = self._get_old_value("package")
        package_changed = bool(old_pkg) and old_pkg != pkg_name

        table_fields = [
            "package_destination",
            "package_activity",
            "package_accomadation",   # note: spelling as per your fieldname
            "package_transportation",
        ]

        has_any_rows = False
        for tf in table_fields:
            if len(self.get(tf) or []) > 0:
                has_any_rows = True
                break

        if (not has_any_rows) or package_changed or (not old_pkg):
            pkg = frappe.get_doc("Travel Package", pkg_name)

            # (Optional) copy header fields if present on Itinerary
            for hf in ["duration_day", "duration_nights", "min_no_pax", "hotel_rating", "cost_per_person", "package_type"]:
                if self.meta.has_field(hf) and pkg.meta.has_field(hf):
                    self.set(hf, pkg.get(hf))

            # Copy package child tables -> itinerary child tables
            self._copy_child_table(pkg, "package_destination", self, "package_destination")
            self._copy_child_table(pkg, "package_activity", self, "package_activity")
            self._copy_child_table(pkg, "package_accomadation", self, "package_accomadation")
            self._copy_child_table(pkg, "package_transportation", self, "package_transportation")

    def _get_old_value(self, fieldname):
        # Best: doc_before_save (works when editing existing doc in UI/API)
        try:
            old = self.get_doc_before_save()
            if old:
                return (old.get(fieldname) or "").strip()
        except Exception:
            pass

        # Fallback: DB read (works if doc already exists)
        try:
            if self.name:
                v = frappe.db.get_value(self.doctype, self.name, fieldname)
                return (v or "").strip()
        except Exception:
            pass

        return ""

    def _copy_child_table(self, source_doc, source_field, target_doc, target_field):
        # Determine target child doctype + allowed fields
        target_child_dt = None
        df = target_doc.meta.get_field(target_field)
        if df and df.fieldtype == "Table":
            target_child_dt = df.options

        if not target_child_dt:
            return

        allowed = set()
        m = frappe.get_meta(target_child_dt)
        for f in m.fields:
            fn = f.fieldname
            if not fn:
                continue
            if fn in ("name", "owner", "creation", "modified", "modified_by", "docstatus", "idx",
                      "parent", "parenttype", "parentfield"):
                continue
            if f.fieldtype in ("Section Break", "Column Break", "Tab Break", "Button", "HTML", "Fold"):
                continue
            allowed.add(fn)

        # Clear target table
        target_doc.set(target_field, [])

        # Copy rows by common fields
        for r in (source_doc.get(source_field) or []):
            row_dict = r.as_dict()
            new_row = target_doc.append(target_field, {})
            for k in allowed:
                if k in row_dict:
                    new_row.set(k, row_dict.get(k))
