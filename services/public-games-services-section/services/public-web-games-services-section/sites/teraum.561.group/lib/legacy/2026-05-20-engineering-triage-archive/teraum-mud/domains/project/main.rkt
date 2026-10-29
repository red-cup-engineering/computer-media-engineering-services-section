#lang racket

(require qtops)

(provide project-teraum)


(define ((>issues t)) '())
(define ((>set-issues! t) I)
  (t 'set-procedure! 'issues
     (λ () I)))
(define ((>add-issues! t) I)
  (t 'set-issues! (append (t 'issues) I)))
(define ((>add-issue! t) #:subject [subject #f]
                         #:brief [brief #f]
                         #:tags [tags #f]
                         #:milestone [milestone #f])
  (t 'add-issues!
     (list
      (list
       (if subject subject "Unnamed Issue")
       brief
       (if tags tags '())
       milestone
       #t)))) ;; <-- #t : active-issue?

(define (>>make-project-procedures t)
  (list
   (cons 'issues (>issues t))
   (cons 'issue (>issue t))
   (cons 'set-issues! (>set-issues! t))
   (cons 'add-issues! (>add-issues! t))
   (cons 'add-issue! (>add-issue! t))))

(define project-teraum
  (create-thing "Project: Teraum"
                (list >>make-project-procedures)))

((project-teraum 'procedure 'add-issue!) #:subject "Add MSSP support"
 #:tags '("telnet" "Racket"))

((project-teraum 'procedure 'add-issue!)
 #:subject "Create public blog"
 #:brief "If I'm going to release this as a real game with an audience, I should start managing a blog with consistent posts."
 #:tags '("Racket"))

((project-teraum 'procedure 'add-issue!)
 #:subject "Add chalk for graffiti"
 #:brief "Players should be able to get the 'graffiti' command and use it with chalk to write on things.")

((project-teraum 'procedure 'add-issue!)
 #:subject "Add quit command")
