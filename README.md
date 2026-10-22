# Computer media content services section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Owns capabilities whose primary nouns are computer media content, including
audio, images, and video.

## Source-bound OpenTimelineIO rendering

The `./otio-render` export owns one bounded, **actual** computer-media
transformation: an existing OpenTimelineIO `Timeline.1` with a single video
`Track.1` and ordered `Clip.2` source ranges is cut and rendered to a new
H.264/AAC MP4 using FFmpeg. It accepts source-relative milliseconds via
`RationalTime.1`, verifies each original file's RFC 6920 SHA-256 `ni:`
identity, probes original video/audio streams with FFprobe, refuses unsupported
effects, and observes the completed movie's duration and content identity.

The original edited `.otio` is upstream and remains editable. The returned
`SourceBoundOtioRenderedVideo` receipt identifies the concrete output bytes
and exact upstream source NIs, **not** film approval. The caller still owns
rights, visual-argument review, independent editorial receiving, closed captions,
cost receipts, delivery, and public-platform readback. Use
`renderOtioVideoCuts({editPath, sourceMedia, outputPath})`, with each sourceMedia
entry carrying `filePath`, `mediaType`, and `sourceVideoNi`. There is no
hidden video generation, network I/O, new editing JSON format, or SignCell
replacement.

Current supported profile: 2–32 flat, video-only OTIO clips in one Video
track, source-relative exact-millisecond ranges, 24/25/30/60 fps, normalized
video and stereo audio; transitions, time warps and extra tracks *refuse* rather
than silently disappear. This is not a complete NLE or animation studio. The
native source suite uses real generated red/blue test-video bytes to prove
that output edits show actual changed footage rather than six renamed markers.
