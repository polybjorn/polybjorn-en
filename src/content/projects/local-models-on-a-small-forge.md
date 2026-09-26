---
title: Finding what I wrote before
description: "Local AI models against plain word counting on a Git forge, graded on cross-references already there."
date: 2026-09-25
wip: true
thumb: /images/local-models-thumb.svg
thumbAlt: An unlabelled bar chart, one long blue bar above four shorter amber ones and a short grey one
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
ranked by term overlap, up to five of them above a score cut-off; it misses
about a third of real links, so an absent issue here is not a clearance</span></code></pre>

Both were the right things to read and I'd forgotten both. It finds the right issue in its top five 63.8% of the time. Showing the five most recent issues instead - the obvious cheap alternative - manages 23.1%, and picking at random 2.6%.

The method underneath is older than I am. Count the words in every document, weight the rare ones more heavily than the common ones, and call two documents similar when they share unusual vocabulary. It's called TF-IDF, it's about fifty years old, and the largest single improvement I made to it had no cleverness in it either: indexing the comments as well as the issue text, worth about seven points. The comments were twice the volume of the issue bodies and I simply hadn't been using them.

## How I know it works

Any of this is worthless without an answer key.

> Every time someone writes `#123` in an issue, they're asserting that two issues are related. A judgement someone already made, recorded and free.

My forge had 617 of them sitting there already, spread across 489 issues. So the test writes itself: hide the reference, show the system only the new issue's text, and ask whether it finds the issue the author actually linked. Only against issues that existed at the time, so nothing borrows from the future.

<button class="img-zoom" type="button" data-full="/images/local-models-answer-key.svg">
  <img src="/images/local-models-answer-key.svg" alt="Three steps. One, issue 968 cites issue 956, so someone has already said the two are related. Two, strip the reference, so the tool sees the text and never the link. Three, search only the issues that existed when 968 was filed, and count it a hit if 956 comes back in the first five." />
</button>
<p class="img-caption">#968 is a real one: it names #956 in its own body, so that pair is one of the 617.</p>

## Then the models lost

Language models and embedding models get confused with each other. They do different things.

**A language model** gives back new text. It's good at writing and answering, and it goes wrong by being fluent and wrong at the same time.

**An embedding model** gives back a position in space, arranged so similar things land near each other. Measuring distance is the only thing you can do with it, which makes it good at exactly one job: *find me the things like this one*. It goes wrong by ranking something irrelevant near the top, which you notice immediately, because it can't assert anything.

The ones I tried are a couple of hundred megabytes each, need no graphics card, and the text never leaves the machine. Each went against the same links, with the prompt format its authors specify.

<figure class="mchart" role="group" aria-label="Recall at 5 by method, in four groups. Counting words alone: term weighting with comments reaches 63.8 percent, tuned BM25 62.8. Embedding models: the best, gte-small, reaches 46.0 percent. Two stages: counting words plus the links already between issues reaches 67.2 percent, counting words plus a reranker 39.3. Controls: recency 23.1 percent, random 2.6.">
  <div class="mchart-key">
    <span><i class="mchart-sw mchart-lex"></i>no model</span>
    <span><i class="mchart-sw mchart-emb"></i>neural model</span>
    <span><i class="mchart-sw mchart-ctl"></i>baseline to beat</span>
  </div>
  <div class="mchart-group">Counting words</div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words + comments</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:91.1%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">BM25 + comments, tuned*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:89.7%"></div></div>
    <div class="mchart-val">62.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Identifiers kept whole</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:88.4%"></div></div>
    <div class="mchart-val">61.9%</div>
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
    <div class="mchart-label">BM25, untuned</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:68.0%"></div></div>
    <div class="mchart-val">47.6%</div>
  </div>
  <div class="mchart-group">One embedding per document</div>
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
  <div class="mchart-group">Counting words, then a second pass</div>
  <div class="mchart-row">
    <div class="mchart-label">+ links already there*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:96.0%"></div></div>
    <div class="mchart-val">67.2%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ reranker</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:56.1%"></div></div>
    <div class="mchart-val">39.3%</div>
  </div>
  <div class="mchart-group">Controls</div>
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
  <figcaption class="mchart-cap">How often the issue someone actually linked turns up in the first five suggestions, out of hundreds of candidates. Every bar queries with the new issue's title and body over the 617 links; rows added on 2026-09-26 read 616, one body having been edited since, and the leader scores 63.6% on those. Rows marked * picked their settings on the oldest three quarters of the links. The table further down is a smaller and harder slice, so its numbers are lower.</figcaption>
</figure>

Every one lost, and not narrowly. I'd written down the opposite prediction beforehand, which is the only reason I can honestly call it a surprise. The obvious escapes didn't help either: chunking the documents so nothing was truncated made every model *worse*, and blending a model with the word counting - the way these systems are normally deployed - came out below the word counting alone.

The reason is visible once you look at what my issues are made of. They're full of identifiers: `StateDirectory`, `checks/service-state.nix`, machine names. Exact matching on a rare string is precisely what counting words is best at, and what a model trained on ordinary prose is worst at. The model is better at language. My text is barely language.

<button class="img-zoom" type="button" data-full="/images/local-models-vocabulary.svg">
  <img src="/images/local-models-vocabulary.svg" alt="An issue from the forge with its words shaded by how many of the 489 issues contain them. The rarest are identifiers: checks/service-state.nix appears in 14, StateDirectory in 13, census in 5, packaged in 2 and rowless-unit in 1. The ordinary English words around them appear in hundreds." />
</button>
<p class="img-caption">One issue, shaded by how many of the 489 contain each word. <code>checks/service-state.nix</code> is in 14 of them, <code>StateDirectory</code> in 13, <code>rowless-unit</code> in exactly one. Those carry the sentence, and they are the strings a model trained on English has never seen. Rarity is measured against this forge rather than against English, which is why "fewer" is blue too.</p>

## The things that didn't work

**A model that decides.** The first thing I built was Jev's shape aimed at my labels - predict who should act on an issue, act above a confidence threshold, escalate below it. It isn't a decision anything can take. Four issues in five are labelled within a minute of being filed, because whoever writes one labels it in the same breath. The filing and the deciding happen at once, so there is nothing for a model to stand between. That's not a model being too weak; it's a job that doesn't exist, and one query against the timestamps found it.

**Teaching a model my vocabulary.** The comfortable explanation for the results above is that the models were strangers to my identifiers. So I fine-tuned one on the forge's own pairs, training on some links and holding the rest back.

This one can't go in the chart above. A model trained on my own links has to be judged on links it never saw, so it needs a quarter of them held back - and once you hold data back, every figure has to be recomputed on that smaller, harder set. That's why counting words is 48.7% here and 63.8% in the chart. Two things changed: these are scored on the held-out quarter, and every row reads issue bodies alone, which is what the fine-tuned model saw.

| held back from the start | linked issue in the first five |
| --- | --- |
| counting words | 48.7% |
| a model trained on my own pairs | 40.9% |
| the same model, untrained | 37.7% |

Training helped and it didn't matter. Three points is five links out of the hundred and fifty-four held back, against a natural variation of about six - inside the noise, indistinguishable from luck. The distance to counting words is twelve links, which is real. I taught it the vocabulary and it stayed behind.

**Scoring the pair instead of the documents.** This one is in the chart above. Everything else there compares documents *apart* - each turned into a position, then measured. A cross-encoder reads the query and a candidate *together*, which is slower and usually much sharper, and is what a real search engine runs as a second pass over the first stage's top fifty. So I ran it, and it took 63.8% down to 39.3%. A second, stronger reranker was worse still: on the held-out set it reordered a shortlist that held the right answer four times in five and landed at 22.1%. It isn't failing to spot the answer. It's pushing it down.

**The labels I already had.** Every issue carries a `host/*` label and often a milestone, none of it text, so nothing above reads any of it. The signal is real: two issues that link to each other share a host label 75% of the time, against 41% for any two drawn from the pool. Adding it to the ranking moved nothing, and the reason is the thing I hadn't checked - 73% of bodies name their own host in words, so counting words had already counted it. It also read the labels as they stand today, free hindsight over what an issue carried when it was filed.

## What did beat it

**The links themselves.** Everything above reads text. The one thing that finally beat counting words reads something else: the links already between issues. Take the top three hits counting words finds, and lift whatever those issues already link to. Related issues cluster - a decision, its follow-ups, the fix that later undid it - and they cite each other, so one good hit pulls in siblings that share few words with the new issue. It's worth about four points over all the links, to 67.2%, and comparing the two methods link by link puts that clear of luck. It counts only links that existed when the new issue was filed, and it still has no model in it.

## What I'd tell anyone trying this

**Count your data before you run anything.** I had three candidate jobs and checked the size of one. The other two turned out to have four usable examples each - four, not four hundred - which five minutes of counting would have shown. Nothing rescues a task with no data in it.

**Look for an answer key you already have.** Cross-references, stars, what you archived rather than deleted, what you clicked. If your own past behaviour is written down somewhere, you can grade a system honestly instead of eyeballing it and hoping.

**The angle matters more than the model.** Same text, same machine, no model in either case: one framing failed completely and another produced something I use daily. That difference was worth more than any model choice was.

**Write the bar down before you run the test.** Mine was fixed in advance, and it's the only reason the first failure was a clear no rather than a negotiation with myself about whether 2.4% was encouraging.

**Build it so you can run it again.** Every number here is one run against a frozen copy of the forge, on the date at the top of this page. The corpus has a checksum and the tool carries its own benchmark, so re-measuring takes seconds. None of these numbers are permanent, and I'd expect the gap to grow: counting words gets better statistics from more documents, while an off-the-shelf model learns nothing from mine.

## What this doesn't show

The answer key only credits links someone bothered to type. One issue about journal entries failing to arrive carried no reference at all, so every suggestion for it scored as a miss - including the obviously correct earlier issue about the same subsystem. The numbers are a floor on usefulness, not a measure of precision.

The corpus is small, and the largest models were never tried, so nothing here says a big one would fail. Nor were the code-trained retrieval models, now the ones I'd most want to see: the two I could run are code-trained *encoders* rather than retrieval models, and one scored barely above random. Their vectors were never built to be compared by distance, so that number says nothing about code training.

I expected the result to belong to this kind of text, and wrote here that the ranking would flip on prose. So I ran the same test on my notes vault - 3,495 wikilinks between about 7,600 notes - and it didn't. Counting words beat all four models there too, in the same order. The one difference is that blending in the best model helps by about a point, which does not survive on the held-out half. My notes turn out to be short and full of names, which is closer to the forge than I'd assumed.

The last limit is the tool's own doing. Something that finds a genuinely related issue about two thirds of the time **cannot be read as a clearance.** Checking it, seeing nothing, and concluding the question is new converts *I didn't look* into *I looked and it was clear*, which is worse than never having looked. So it says so on every run.
