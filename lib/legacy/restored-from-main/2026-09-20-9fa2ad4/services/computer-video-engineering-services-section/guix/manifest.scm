;; Local renderer development/test toolchain only; production uses Docker.
(use-modules (guix profiles) (gnu packages node) (gnu packages speech) (gnu packages video) (gnu packages version-control))
(packages->manifest (list node flite ffmpeg git))
