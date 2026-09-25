---
title: "Embeddings lost to counting words"
description: "I wanted a model that makes small decisions on my issue tracker. Five embedding models later, a fifty-year-old way of counting words was still winning."
date: 2026-09-25
draft: true
---

I run a self-hosted issue tracker for my own infrastructure. A few hundred issues sit on it, and they've developed a habit I've grown to dislike. I decide something, write it down carefully, and then rediscover the same question six weeks later, because I'd forgotten the answer was already there.

What set this off was reading about [Jev](https://typesafe.ai/), a model built to return typed decisions rather than prose - the pitch being that software can act on its answer when its confidence is high and escalate when it's not. I haven't used it. It's hosted, and everything here runs on my own hardware. But the shape of it stuck: a small, narrow model that decides one thing and knows when it's unsure. My tracker is full of small decisions. I wanted to know whether something like that, running locally on a machine I already own, could take some of them.

So the first thing I built was that shape, aimed at the most obvious decision I had.

*Does a small local model do useful work here* is a question with a shelf life, though. The models keep improving, my tracker keeps accumulating issues, and any answer is a reading taken on one particular day with one particular pile of text. The question underneath doesn't expire: **how do you find out, on your own data, instead of trusting a benchmark built on somebody else's?** That is the part worth writing down, and everything below is a first reading rather than a verdict.

## There was no decision to automate

The decision I picked was the label every issue carries saying who should act on it: this one can be picked up, this one needs me, this one's blocked. Predict that, confidently enough to act above a threshold and escalate below it, and I'd have the thing I'd just read about.

It isn't a decision anything can take, and it took counting rather than a model to find out. **Four issues in five are labelled within a minute of being filed.** Whoever writes one labels it in the same breath. There's no interval between the filing and the deciding for anything to stand in.

That's worth separating from the question of whether a model is good enough, because it isn't that kind of failure. Automating a decision requires the decision to be *separable* - made later, deliberately, from something written down. Where it's not, no model fills the gap, however fast or well calibrated, hosted or local. I never tested Jev and this says nothing about it; it says something about my data, which is the only thing I could have found out by testing anything.

## The question I could answer

So I asked a smaller question instead, and it turned out to be the one I actually wanted: **when I start writing a new issue, which existing ones should I read first?**

The competing method is much older and has no model in it at all. Count the words in every document, weight the rare ones more heavily than the common ones, and call two documents similar when they share unusual vocabulary. It's called TF-IDF, it's about fifty years old, and it will matter later.

Grading that needs an answer key, and this is the part I'd repeat anywhere.

> Every time someone writes `#123` in an issue, they're asserting that two issues are related. A human judgement, already recorded, free.

My tracker had 616 of them.

So the test writes itself. Hide the reference, show the system only the new issue's text, and ask whether it finds the issue the author actually linked. Do it only against issues that existed at the time, so nothing borrows from the future.

Counting words found the right issue in its top five **63.8%** of the time. Showing the five most recent issues instead - the obvious cheap alternative - managed 23.1%. Picking at random managed 2.6%.

Here it's against a draft about a service losing its place in the log stream:

<pre><code>$ issue-related "systemd-journal-upload cursor lost after reboot, journal replays"

  #956   0.14  hypervisor: no journal entries reached VictoriaLogs in 15m
  #968   0.10  checks: service-state can't see a StateDirectory from a packaged unit
<span style="color:#8b949e">
ranked by term overlap; it misses about a third of real links, so an
absent issue here isn't a clearance</span></code></pre>

Both are the right things to read, and I'd forgotten both. That's the tool I kept. The largest single improvement came from something with no cleverness in it at all: **indexing the comments as well as the issue text, worth about five points.** The comments were two and a bit times the volume of the issue bodies and I'd simply not been using them.

## What an embedding model actually is

The obvious next move was to put a model against that same test. Not the kind most people mean by AI, though, and the difference matters before any of the numbers do.

A large language model writes. You give it words and it gives you new words back, which is why it can answer a question, draft a paragraph, or be confidently wrong in fluent prose. An embedding model doesn't write anything. It turns a piece of text into a list of numbers - a position in space - arranged so that texts about similar things land near each other. That's the entire output. The only operation you can perform on it's measuring distance.

Three kinds of thing get called AI in a conversation like this one, and they're not interchangeable:

| | what it gives back | what it's for | how it goes wrong |
| --- | --- | --- | --- |
| Language model | new text | writing, answering, summarising | fluent and wrong |
| Embedding model | a position in space | finding similar things | ranks something irrelevant highly |
| Typed-decision model | a typed answer plus a confidence | deciding, at machine speed | declines, or decides wrongly inside its stated confidence |

Jev is the third. I went looking for something that decides, and what my tracker turned out to need was something that finds.

The embedding models I used are small enough to sit in a couple of hundred megabytes, run on an ordinary processor with no graphics card, and take about twenty milliseconds per document. They can't hallucinate, because they can't assert anything. If you have heard of retrieval-augmented generation, this is the retrieval half of it on its own - and I only ever wanted that half. I wasn't after something that writes. I needed something that finds.

That makes them good at exactly one class of job: *find me the things like this one*. Search that tolerates different wording, grouping, spotting duplicates. They run on a laptop, they cost nothing per query, and the text never leaves the machine. That combination is why they're interesting for a private pile of notes or issues.

## The models lost

At this point I'd used no model. Four small embedding models went in next, each with the prompt format its authors specify, all scored on the same links.

![Horizontal bar chart of recall@5 by method. The five term-weighting methods run from 63.8% down to 47.6%; the four embedding models sit below them from 46.0% to 41.0%; a recency control reaches 23.1% and a random control 2.6%.](/images/local-models-methods.svg)

Every one of them lost, and not narrowly. The best reached 46.0% against 63.8%.

I'd written down the opposite prediction before running it, which is the only reason I can say honestly that it was a surprise rather than something I expected all along. I also checked the obvious escapes and none of them helped: chunking the documents so nothing was truncated made every model *worse*, and blending a model with the word counting - the way these systems are normally deployed - came out below the word counting alone.

The reason is visible once you look at what my issues are made of. They are full of identifiers: `StateDirectory`, `checks/service-state.nix`, machine names. Exact matching on a rare string is precisely what counting words is best at, and it's what a model trained on ordinary prose is worst at. The model is better at language. My text is barely language.

## Training one on my own data didn't rescue it

The obvious objection is that the models were strangers. Train one on my own material and the objection goes away.

That's testable, and it has to be done carefully or the answer is meaningless: train on some of the links, hold the rest back, and never let the training see what it will be graded on. 462 links trained a small model in 95 seconds on a CPU. 154 were kept back to score it.

| on the held-out links | found it in the top five |
| --- | --- |
| the model, untrained | 37.7% |
| the model, trained on my own pairs | 40.9% |
| counting words | 48.7% |

Training helped, and it didn't matter. Three points here is five links out of 154, against a natural variation of about six. It is inside the noise; I can't tell it from luck. The distance to counting words is twelve links, which is outside the noise and is real.

So the comfortable explanation - *it only lost because it didn't know my vocabulary* - survives in a much weaker form. I taught it the vocabulary. It stayed behind.

## What I'd tell anyone trying this

**Count your data before you run anything.** I'd three candidate jobs and only checked the size of one. The other two turned out to have four usable examples each - not four hundred, four - which five minutes of counting would've shown before any of the work. Nothing rescues a task with no data in it.

**Look for an answer key you already have.** Cross-references, stars, what you archived versus deleted, what you clicked. If your own past behaviour is written down somewhere, you can grade a system honestly instead of eyeballing it and hoping.

**The angle matters more than the model.** Same text, same machine, no model in either case: one framing failed completely and another produced something I use. That difference was worth roughly twenty times what any model choice was worth.

**Write the bar down before you run the test.** Mine was fixed in advance, and it's the only reason the first failure was a clear no rather than a negotiation with myself about whether 2.4% was encouraging.

**Build it so you can run it again.** This is the one I'd have skipped. The corpus is frozen with a checksum, the split between what trains and what scores is written down, and the tool itself carries the benchmark, so re-measuring is seconds rather than a reconstruction. None of the numbers here are permanent - the models get better, my pile of issues gets bigger, and the honest expectation is that this flips at some point. What I want when it does is to notice, not to re-derive the whole thing from memory.

Which is why the results sit in a dated list at the bottom rather than in the prose as though they were facts about the world. Adding a second reading should cost one line, not a rewrite.

## What this doesn't show

The answer key only credits links somebody bothered to type. One issue about journal entries failing to arrive carried no reference at all, so every suggestion for it scored as a miss - including the obviously correct earlier issue about the same subsystem, which came first. The numbers are a floor on usefulness, not a measure of precision.

The corpus is under 500 issues, and the largest models were never tried, so nothing here says a big one would fail. Nor were the code-trained retrieval models, which are the ones I'd most want to see: the two I could run are code-trained *encoders* rather than retrieval models, and one scored barely above random - a fact about output never built to be compared this way, not about code. Untested, not answered.

The last limit matters most, because this kind of tool introduces it rather than inheriting it. Something that finds a genuinely related issue about two thirds of the time **can't be read as a clearance.** Checking it, seeing nothing, and concluding the question is new converts *I didn't look* into *I looked and it was clear*, which is worse than never having looked. So it says so on every run.

## Readings

Every number above comes from a single run against a frozen copy of the tracker, so it's a measurement with a date on it rather than a standing fact. I've not committed to a schedule and will not pretend to one; this list grows when I run it again.

**2026-09-25 - 489 issues, 616 cross-references, 1060 comments.** Counting words with the comments indexed, 63.8% in the top five. Best of four small embedding models, 46.0%. A model fine-tuned on the tracker's own pairs, 40.9%, against 37.7% for the same model untrained - a difference too small to separate from luck. Showing the five most recent issues instead, 23.1%.
