---
title: Putting a name to unknown audio
description: A tool that listens to unlabelled audio tracks in MKV video files and works out what language they are in.
date: 2026-08-28
cover: /images/audio-lang-tagger-ui.svg
coverAlt: The tool's interactive card, showing whisper's verdict for one audio track alongside the words it heard
thumb: /images/audio-lang-tagger-thumb.svg
thumbAlt: A label tag containing an audio waveform
links:
  - label: GitHub
    href: https://github.com/polybjorn/audio-lang-tagger
    icon: github
---

A video file can carry several audio tracks, and not all of them say what they are. An unlabelled one comes up as "Unknown" wherever you play it, so choosing between them means guessing which is the original, which is a dub, and which is somebody talking over the top. Across a whole collection it adds up to hundreds of tracks nobody ever got around to labelling.

Seen through [ffprobe](https://ffmpeg.org/ffprobe.html), the standard way to ask a video file what it holds, a labelled track shows its language right after the stream number, like <code>#0:1(nor)</code>. These two have nothing there at all:

<pre><code>$ ffprobe "Interviews/Bergen 2018.mkv"
<span style="color:#8b949e">...
  Stream #0:0: Video: hevc (Main), yuv420p(tv), 1920x1080, 25 fps</span>
  Stream #0:1: Audio: aac (LC), 48000 Hz, stereo <span style="color:#8b949e">(default)</span>
  Stream #0:2: Audio: aac (LC), 48000 Hz, stereo
    <span style="color:#8b949e">Metadata:
      title           : Interpreter</span>
</code></pre>

[audio-lang-tagger](https://github.com/polybjorn/audio-lang-tagger) fills that in. It works out what language each unlabelled track is in and writes that into the file. Since that means editing my own files, it can also just look and report what is still missing a label, which is the safer place to start. Same file, but the gap now has a name:

<pre><code>$ audio-lang-tagger.py --list ~/video
<span style="color:#8b949e">[1/1] Interviews/</span>
      <span style="color:#56b6c2;font-weight:700">Bergen 2018.mkv</span>
  track a1: aac 2ch <span style="color:#8b949e">- language missing</span>
  track a2: aac 2ch, "Interpreter" <span style="color:#8b949e">- language missing</span>
</code></pre>

It gets there by listening. A few seconds of the track go through [whisper.cpp](https://github.com/ggml-org/whisper.cpp), a speech recognition program running on my own machine, and I get back the words it heard alongside the language it believes they are. Where I have a catalogue that already knows what the original language ought to be, that shows up beside the guess as a second opinion. I press Enter to accept it, or type the right language myself.

Saving the label leaves the picture and the sound untouched. It only rewrites the note attached to them, which is why even a 40 GB file is finished in well under a second. Every change is written down as it happens, so anything I get wrong can be put back:

<pre><code>$ audio-lang-tagger.py --ledger 2
Ledger       2 rows   manual 2
<span style="color:#8b949e">             ~/.local/state/audio-lang-tagger/lang_tagger_tags.tsv</span>

<span style="color:#8b949e">  2026-08-27 19:42:11</span>  <span style="color:#7ee787;font-weight:700">und-&gt;nor   </span> manual <span style="color:#8b949e">p0.96  </span> a1  Interviews/Bergen 2018.mkv
<span style="color:#8b949e">  2026-08-27 19:42:29</span>  <span style="color:#7ee787;font-weight:700">und-&gt;eng   </span> manual <span style="color:#8b949e">p0.91  </span> a2  Interviews/Bergen 2018.mkv
</code></pre>

It can also be left to run on its own, and the bar for labelling anything without asking is worth stating plainly. Every sample taken from a track has to come back as the same language at 0.90 confidence or better, there has to be enough varied speech behind that verdict to rule out singing, and an outside source has to agree independently. Past that it refuses whole categories where it knows it is unreliable: anything made before 1940, where dialogue tends to be thin; music and concert recordings; files carrying more than one audio track; and the Norwegian, Danish and Swedish cluster it mixes up too often to be trusted with. Everything that falls short of all of that waits for me.

Setting the label by hand has always been possible, and [MKVToolNix](https://mkvtoolnix.download/) does it in seconds once you know the answer. Working out the answer is the part that does not scale, and [ULDAS](https://github.com/netplexflix/MKV-Undefined-Audio-Language-Detector) already automates it, along with a good deal more. What it lacks is a setting between a dry run and writing every label it is confident about, and that middle is what I wanted, because the two mistakes here are not the same size. Being asked costs a second. A wrong label is silent, stays in the file, and gets acted on later by whatever reads it.

Nor does confidence sort the safe cases from the risky ones. A musical short came back confidently labelled off a transcript that was a 219-word “la la la” loop, while a sparse cartoon with 99 perfectly clear words scored badly. They fail in opposite directions, so no single number puts them in the right order. I would rather be shown what was heard.

<button class="img-zoom" type="button" data-full="/images/audio-lang-tagger-threshold.svg">
  <img src="/images/audio-lang-tagger-threshold.svg" alt="A confidence scale running from 0, unsure, to 1, certain. A musical short with no speech sits at 0.86, further right than a sparse cartoon with 99 clean words at 0.42. Dashed lines mark candidate cutoffs at 0.35, 0.65 and 0.90." />
</button>
<p class="img-caption">Cut at 0.35 and both pass, at 0.65 only the music passes, and at 0.90 neither does.</p>

In practice the listening happens ahead of time, unattended on the machine that holds the files, so by the time I sit down to work through the results there is nothing left to wait for.
