---
title: "The model was the least important part"
description: "How to find out whether a tool helps on your own data, without trusting someone else's benchmark. A first reading: four embedding models lost to counting words."
date: 2026-09-25
draft: true
---

I run a self-hosted issue tracker for my own infrastructure. A few hundred issues sit on it, most of them written by me or by an agent working on my behalf, and they have a habit I have grown to dislike: I decide something, write it down carefully, and then rediscover the same question six weeks later because I did not remember that the answer was already there.

<!-- TRIGGER: one sentence about Jev goes here if we keep it - what it is and
     what it does, in your words. It was never tested, so it can only be what
     made me curious, never a comparison. The piece reads fine without it. -->

So I wanted to know whether a small model, running locally on a machine I already own, could do something about that. Not a chatbot. Something narrow, cheap and specific.

*Does a small local model do useful work here* is a question with a shelf life, though. The models keep improving, my tracker keeps accumulating issues, and any answer is a reading taken on one particular day with one particular pile of text. The question underneath it does not expire: **how do you find out, on your own data, instead of trusting a benchmark built on somebody else's?** That is the part worth writing down, and everything below is a first reading rather than a verdict.

## What these models actually do

An embedding model turns a piece of text into a list of numbers - a position in space - arranged so that texts about similar things land near each other. Nothing is generated and nothing is written. The only thing you can do with the output is measure distance.

That makes them good at exactly one class of job: *find me the things like this one*. Search that tolerates different wording, grouping, spotting duplicates. They run on a laptop, they cost nothing per query, and the text never leaves the machine. That combination is why they are interesting for a private pile of notes or issues.

The competing method is much older and has no model in it at all. Count the words in every document, weight the rare ones more heavily than the common ones, and call two documents similar when they share unusual vocabulary. It is called TF-IDF, it is about fifty years old, and it will matter later.

## The first idea was the wrong one

My tracker labels issues by who should act: an agent may take this one, this one needs a decision from me, this one is blocked. Predicting that label looked like the obvious first job.

It is not a job at all, and the data said so immediately. **Four issues in five get their label within sixty seconds of being filed, and more than half in the same second.** Whoever writes the issue labels it in the same breath. There is no gap between filing and deciding for a model to stand in.

That generalises past this one tracker. Automating a judgement requires that the judgement be *separable* - that somebody makes it later, deliberately, from information that is written down. If the decision happens at the same instant as the thing it is about, there is nothing to predict. Worth checking before building anything.

## The question that did have an answer

The useful version turned out to be the thing I actually wanted: **when I start writing a new issue, which existing ones should I read first?**

Grading that needs an answer key, and this is the part I would repeat anywhere. **Every time someone writes `#123` in an issue, they are asserting that two issues are related.** That is a human judgement, already recorded, free. My tracker had 616 of them.

So the test writes itself. Hide the reference, show the system only the new issue's text, and ask whether it finds the issue the author actually linked. Do it only against issues that existed at the time, so nothing borrows from the future.

Counting words found the right issue in its top five **63.8%** of the time. Showing the five most recent issues instead - the obvious cheap alternative - managed 23.1%. Picking at random managed 2.6%.

That is a working tool, and it is the one I kept. The largest single improvement came from something with no cleverness in it at all: **indexing the comments as well as the issue text, worth about five points.** The comments were two and a bit times the volume of the issue bodies and I had simply not been using them.

## Then the models lost

At this point I had used no model. Four small embedding models went in next, each with the prompt format its authors specify, all scored on the same links.

![Horizontal bar chart of recall@5 by method. The five term-weighting methods run from 63.8% down to 47.6%; the four embedding models sit below them from 46.0% to 41.0%; a recency control reaches 23.1% and a random control 2.6%.](/images/local-models-methods.svg)

Every one of them lost, and not narrowly. The best reached 46.0% against 63.8%.

I had written down the opposite prediction before running it, which is the only reason I can say honestly that it was a surprise rather than something I expected all along. I also checked the obvious escapes and none of them helped: chunking the documents so nothing was truncated made every model *worse*, and blending a model with the word counting - the way these systems are normally deployed - came out below the word counting alone.

The reason is visible once you look at what my issues are made of. They are full of identifiers: `StateDirectory`, `checks/service-state.nix`, machine names. Exact matching on a rare string is precisely what counting words is best at, and it is what a model trained on ordinary prose is worst at. The model is better at language. My text is barely language.

## So I trained one on my own data

The obvious objection is that the models were strangers. Train one on my own material and the objection goes away.

That is testable, and it has to be done carefully or the answer is meaningless: train on some of the links, hold the rest back, and never let the training see what it will be graded on. 462 links trained a small model in 95 seconds on a CPU. 154 were kept back to score it.

| on the held-out links | found it in the top five |
| --- | --- |
| the model, untrained | 37.7% |
| the model, trained on my own pairs | 40.9% |
| counting words | 48.7% |

Training helped, and it did not matter. Three points here is five links out of 154, against a natural variation of about six. It is inside the noise; I cannot tell it from luck. The distance to counting words is twelve links, which is outside the noise and is real.

So the comfortable explanation - *it only lost because it did not know my vocabulary* - survives in a much weaker form. I taught it the vocabulary. It stayed behind.

## What I would tell anyone doing this with their own pile of text

**Count your data before you run anything.** I had three candidate jobs and only checked the size of one. The other two turned out to have four usable examples each - not four hundred, four - which five minutes of counting would have shown before any of the work. Nothing rescues a task with no data in it.

**Look for an answer key you already have.** Cross-references, stars, what you archived versus deleted, what you clicked. If your own past behaviour is written down somewhere, you can grade a system honestly instead of eyeballing it and hoping.

**The angle matters more than the model.** Same text, same machine, no model in either case: one framing failed completely and another produced something I use. That difference was worth roughly twenty times what any model choice was worth.

**Write the bar down before you run the test.** Mine was fixed in advance, and it is the only reason the first failure was a clear no rather than a negotiation with myself about whether 2.4% was encouraging.

**Build it so you can run it again.** This is the one I would have skipped. The corpus is frozen with a checksum, the split between what trains and what scores is written down, and the tool itself carries the benchmark, so re-measuring against the live tracker is a few seconds rather than a reconstruction. None of the numbers above are meant to be permanent - the models get better, my pile of issues gets bigger, and the honest expectation is that this flips at some point. What I want when it does is to notice, not to re-derive the whole thing from memory.

## What this does not show

The answer key only credits links somebody bothered to type. One issue about journal entries failing to arrive carried no reference at all, so every suggestion for it scored as a miss - including the obviously correct earlier issue about the same subsystem, which came first. The numbers are a floor on usefulness, not a measure of precision.

The corpus is under 500 issues. The biggest models were never tried, so nothing here says a large one would fail. Neither were the code-trained retrieval models: the two I did try are code-trained *encoders* rather than retrieval models, and one scored barely above random, which says its output was never built to be compared this way rather than anything about code. That question is untested, not answered.

And the tool has no way to appear at the moment an issue is filed, because the forge will not give the account a webhook. It is a command someone has to remember to run, which is the weakest thing about it.

One last limit is the one that matters most, because it is the failure this kind of tool introduces rather than the ones it inherits. Something that finds a genuinely related issue about two thirds of the time **cannot be read as a clearance.** Checking it, seeing nothing, and concluding the question is new converts *I did not look* into *I looked and it was clear*, which is worse than never having looked. So it says so on every run.
