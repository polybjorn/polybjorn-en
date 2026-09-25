---
title: "Embeddings lost to counting words"
description: "I wanted a model that could make small decisions on my Git forge. Several embedding models later, a fifty-year-old way of counting words was still winning."
date: 2026-09-25
draft: false
unlisted: true
---

I run my own Git forge for my infrastructure - repositories, CI, pull requests, and the issue tracker this is about. Its issues have developed a habit I've grown to dislike. I decide something, write it down carefully, and then rediscover the same question six weeks later, because I'd forgotten the answer was already there.

What set this off was reading about [Jev](https://typesafe.ai/), a model built to return typed decisions rather than prose - the pitch being that software can act on its answer when its confidence is high and escalate when it's not. I haven't used it. It's hosted, and everything here runs on my own hardware. But the shape stuck: a small, narrow model that decides one thing and knows when it's unsure.

What I ended up with decides nothing. It's a search box, it has no model in it, and it works. Getting there took four failures worth about a paragraph each, and one result I'd written down the opposite prediction for.

## What it does

Before filing a new issue, it tells me which existing ones to read first.

<pre><code>$ issue-related "systemd-journal-upload cursor lost after reboot, journal replays"

  #956   0.14  hypervisor: no journal entries reached VictoriaLogs in 15m
  #968   0.10  checks: service-state cannot see a StateDirectory from a packaged unit
<span style="color:#8b949e">
ranked by term overlap; it misses about a third of real links, so an
absent issue here is not a clearance</span></code></pre>

Both were the right things to read and I'd forgotten both. It finds the right issue in its top five **63.8%** of the time. Showing the five most recent issues instead - the obvious cheap alternative - manages 23.1%, and picking at random 2.6%.

The method underneath is older than I am. Count the words in every document, weight the rare ones more heavily than the common ones, and call two documents similar when they share unusual vocabulary. It's called TF-IDF, it's about fifty years old, and the largest single improvement I made to it had no cleverness in it either: indexing the comments as well as the issue text, worth about seven points. The comments were twice the volume of the issue bodies and I simply hadn't been using them.

## How I know it works

Any of this is worthless without an answer key, and this is the part I'd repeat anywhere.

> Every time someone writes `#123` in an issue, they're asserting that two issues are related. A judgement someone already made, recorded and free.

My forge had hundreds of them sitting there already. So the test writes itself: hide the reference, show the system only the new issue's text, and ask whether it finds the issue the author actually linked. Only against issues that existed at the time, so nothing borrows from the future.

## Then the models lost

Language models and embedding models get confused, and the difference is the whole point. An embedding model writes nothing at all - it turns text into a position in space, arranged so similar things land near each other, and measuring distance is the only thing you can do with it.

**A language model** gives back new text. It's good at writing and answering, and it goes wrong by being fluent and wrong at the same time.

**An embedding model** gives back a position in space. It's good at finding similar things, and it goes wrong by ranking something irrelevant near the top - which you notice immediately, because it can't assert anything.

Which makes them good at exactly one job: *find me the things like this one*. They're a couple of hundred megabytes, need no graphics card, and the text never leaves the machine. Four of them went against the same links, each with the prompt format its authors specify.

<figure class="mchart" role="group" aria-label="Recall at 5 by method. Term weighting with comments reaches 63.8 percent; the best embedding model, gte-small, reaches 46.0 percent; a recency control reaches 23.1 percent and a random control 2.6 percent.">
  <div class="mchart-key">
    <span><i class="mchart-sw mchart-lex"></i>counting words</span>
    <span><i class="mchart-sw mchart-emb"></i>neural model</span>
    <span><i class="mchart-sw mchart-ctl"></i>baseline to beat</span>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words + comments</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:91.1%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:81.4%"></div></div>
    <div class="mchart-val">57.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words + topics</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:80.4%"></div></div>
    <div class="mchart-val">56.3%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Character patterns</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:78.6%"></div></div>
    <div class="mchart-val">55.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">BM25</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:68.0%"></div></div>
    <div class="mchart-val">47.6%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/thenlper/gte-small">gte-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:65.7%"></div></div>
    <div class="mchart-val">46.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/intfloat/multilingual-e5-small">multilingual-e5-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:62.9%"></div></div>
    <div class="mchart-val">44.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/BAAI/bge-small-en-v1.5">bge-small-en-v1.5</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:62.4%"></div></div>
    <div class="mchart-val">43.7%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:58.6%"></div></div>
    <div class="mchart-val">41.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words + reranker</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:56.1%"></div></div>
    <div class="mchart-val">39.3%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Five most recent</div>
    <div class="mchart-track"><div class="mchart-bar mchart-ctl" style="width:33.0%"></div></div>
    <div class="mchart-val">23.1%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Random</div>
    <div class="mchart-track"><div class="mchart-bar mchart-ctl" style="width:3.7%"></div></div>
    <div class="mchart-val">2.6%</div>
  </div>
  <figcaption class="mchart-cap">How often the issue someone actually linked turns up in the first five suggestions, out of hundreds of candidates.</figcaption>
</figure>

Every one lost, and not narrowly. I'd written down the opposite prediction beforehand, which is the only reason I can honestly call it a surprise. The obvious escapes didn't help either: chunking the documents so nothing was truncated made every model *worse*, and blending a model with the word counting - the way these systems are normally deployed - came out below the word counting alone.

The reason is visible once you look at what my issues are made of. They're full of identifiers: `StateDirectory`, `checks/service-state.nix`, machine names. Exact matching on a rare string is precisely what counting words is best at, and what a model trained on ordinary prose is worst at. The model is better at language. My text is barely language.

## The things that didn't work

**A model that decides.** The first thing I built was Jev's shape aimed at my labels - predict who should act on an issue, act above a confidence threshold, escalate below it. It isn't a decision anything can take. **Four issues in five are labelled within a minute of being filed**, because whoever writes one labels it in the same breath. There's no interval between the filing and the deciding for anything to stand in. That's not a model being too weak; it's a job that doesn't exist, and one query against the timestamps found it.

**Teaching a model my vocabulary.** The comfortable explanation for the results above is that the models were strangers to my identifiers. So I fine-tuned one on the forge's own pairs, training on some links and holding the rest back.

This one can't go in the chart above. A model trained on my own links has to be judged on links it never saw, so it needs a quarter of them held back - and once you hold data back, every figure has to be recomputed on that smaller, harder set. That's why counting words is 48.7% here and 63.8% in the chart. Two differences, not one: these are scored on the held-out quarter, and every row reads issue bodies alone, which is what the fine-tuned model saw.

| held back from the start | linked issue in the first five |
| --- | --- |
| counting words | **48.7%** |
| a model trained on my own pairs | 40.9% |
| the same model, untrained | 37.7% |

Training helped and it didn't matter. Three points is five links out of the hundred and fifty-four held back, against a natural variation of about six - inside the noise, indistinguishable from luck. The distance to counting words is twelve links, which is real. I taught it the vocabulary and it stayed behind.

**Scoring the pair instead of the documents.** This one is in the chart above. Everything else there compares documents *apart* - each turned into a position, then measured. A cross-encoder reads the query and a candidate *together*, which is slower and usually much sharper, and is what a real search engine runs as a second pass over the first stage's top fifty. Anyone who works on search would ask, so I ran it, and it took 63.8% down to 39.3%. A second, stronger reranker was worse still: on the held-out set it reordered a shortlist that held the right answer four times in five and landed at 22.1%. It isn't failing to spot the answer. It's pushing it down.

**The labels I already had.** Every issue carries a `host/*` label and often a milestone, none of it text, so nothing above reads any of it. The signal is real: two issues that link to each other share a host label 75% of the time, against 41% for any two drawn from the pool. Adding it to the ranking moved nothing, and the reason is the thing I hadn't checked - 73% of bodies name their own host in words, so counting words had already counted it. It even read today's labels rather than the ones an issue carried when it was filed, which is free hindsight, and it still didn't help.

## What I'd tell anyone trying this

**Count your data before you run anything.** I had three candidate jobs and checked the size of one. The other two turned out to have four usable examples each - four, not four hundred - which five minutes of counting would have shown. Nothing rescues a task with no data in it.

**Look for an answer key you already have.** Cross-references, stars, what you archived rather than deleted, what you clicked. If your own past behaviour is written down somewhere, you can grade a system honestly instead of eyeballing it and hoping.

**The angle matters more than the model.** Same text, same machine, no model in either case: one framing failed completely and another produced something I use daily. That difference was worth more than any model choice was.

**Write the bar down before you run the test.** Mine was fixed in advance, and it's the only reason the first failure was a clear no rather than a negotiation with myself about whether 2.4% was encouraging.

**Build it so you can run it again.** The corpus is frozen with a checksum and the tool carries its own benchmark, so re-measuring is seconds rather than a reconstruction. None of these numbers are permanent.

## What this doesn't show

The answer key only credits links someone bothered to type. One issue about journal entries failing to arrive carried no reference at all, so every suggestion for it scored as a miss - including the obviously correct earlier issue about the same subsystem. The numbers are a floor on usefulness, not a measure of precision.

The corpus is small - hundreds of issues, not thousands - and the largest models were never tried, so nothing here says a big one would fail. Nor were the code-trained retrieval models, now the ones I'd most want to see: the two I could run are code-trained *encoders* rather than retrieval models, and one scored barely above random, which is a fact about output never built to be compared this way rather than anything about code. Untested, not answered.

The last limit matters most, because this kind of tool introduces it rather than inheriting it. Something that finds a genuinely related issue about two thirds of the time **cannot be read as a clearance.** Checking it, seeing nothing, and concluding the question is new converts *I didn't look* into *I looked and it was clear*, which is worse than never having looked. So it says so on every run.

## One reading, not a verdict

Every number here comes from a single run against a frozen copy of the forge, on the date at the top of this page, so each is a measurement with a date on it rather than a fact about the world. A growing pile of issues changes every figure rather than just adding one, so checking again means re-running all of it - and I'd expect the gap to widen rather than close, since counting words gets better statistics from more documents while an off-the-shelf model learns nothing from mine.
