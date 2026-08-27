---
title: Putting a name to unknown audio
description: A tool that listens to unlabelled audio tracks in MKV video files and works out what language they are in.
date: 2026-08-27
cover: /images/audio-lang-tagger-ui.svg
coverAlt: The tool's interactive card, showing whisper's verdict for one audio track alongside the words it heard
draft: true
---

A video file can carry several audio tracks, and not all of them say what they are. An unlabelled one comes up as "Unknown" wherever you play it, so choosing between them means guessing which is the original, which is a dub, and which is somebody talking over the top. Across a whole collection it adds up to hundreds of tracks nobody ever got around to labelling.

So I made audio-lang-tagger. It works out what language each unlabelled track is in and writes that into the file. Since that means editing my own files, it can also just look and report what is still missing a label, which is the safer place to start:

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

Setting the label by hand has always been possible, and [MKVToolNix](https://mkvtoolnix.download/) does it in seconds once you know the answer. Working out the answer is the part that does not scale, and something already existed for that too. [ULDAS](https://github.com/netplexflix/MKV-Undefined-Audio-Language-Detector) does the same detection and a good deal more around it, subtitles and rebuilding files included. It can be told to rehearse a run and report what it would do without touching anything, but there is no setting between that and letting it write every label it is confident about. That middle is what I wanted, because the two mistakes available here are not the same size. Being asked costs a second. A wrong label is silent, stays in the file, and gets acted on later by whatever reads it, which is how a pass that removes unwanted audio ends up removing the wrong track. That would matter less if confidence sorted the safe cases from the risky ones, but it does not: a musical short came back confidently labelled off a transcript that was a 219-word “la la la” loop, while a sparse cartoon opening on a music cue scored badly and had 99 perfectly clear words later in the same track. They fail in opposite directions, so no single number puts them in the right order, and a better model would make both rarer without changing that. So I would rather be shown what was heard.

<img src="/images/audio-lang-tagger-threshold.svg" alt="A confidence scale from 0 to 1. A musical short with no speech sits at 0.86, further right than a sparse cartoon with 99 clean words at 0.42. Cutting at 0.35 lets both through, cutting at 0.65 lets only the music through, and cutting at 0.90 lets neither through." />

In practice the listening happens ahead of time, unattended on the machine that holds the files, so by the time I sit down to work through the results there is nothing left to wait for.

<div class="link-buttons">
  <a href="https://github.com/polybjorn/audio-lang-tagger" target="_blank" rel="noopener">
    <svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
    GitHub repository
  </a>
</div>
