(defun teraum-read-record
    (subject)
  "Returns the list representing the record of SUBJECT."
  (cdr (assoc subject teraum-data)))

(defun teraum-read-name
    (subject)
  "Returns the name of the SUBJECT."
  (cdr (assoc 'name (teraum-read-record subject))))

(defun teraum-read-desc
    (subject)
  "Returns the description of the SUBJECT."
  (cdr (assoc 'description (teraum-read-record subject))))

(defun teraum-read-nav
    (subject)
  "Returns the nav items of the SUBJECT."
  (cdr (assoc 'nav (teraum-read-record subject))))

(defun teraum-read-nav-item
    (subject item)
  "Returns the record of the ITEM in the SUBJECT's navigation list."
  (cdr (assoc item (teraum-read-nav subject))))

(defun teraum-read-location
    (subject)
  "Returns the location of SUBJECT."
  (cdr (assoc 'location (teraum-read-record subject))))
