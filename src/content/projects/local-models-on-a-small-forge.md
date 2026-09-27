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

I run my own Git forge for my infrastructure, and its issue tracker has a habit I've grown to dislike: I decide something, write it down carefully, and six weeks later rediscover the same question because I'd forgotten the answer was already there.

So I built something that tells me which existing issues to read before I file a new one. I expected a small local AI model to do that best. None did. What works counts words, follows the links already between issues, and has no model in it.

## What it does

<pre><code>$ issue-related "systemd-journal-upload cursor lost after reboot, journal replays"

  #956   0.14  hypervisor: no journal entries reached VictoriaLogs in 15m
  #968   0.10  checks: service-state cannot see a StateDirectory from a packaged unit
<span style="color:#8b949e">
ranked by term overlap, then by links from the top hits; it misses about
a third of real links, so an absent issue here is not a clearance</span></code></pre>

Both were the right things to read, and I'd forgotten both. It finds the issue I actually needed in its top five about two times in three. Showing the five newest issues instead manages about one in four, and picking at random almost never.

Underneath is TF-IDF, a method about fifty years old: count the words in every document, weight rare words above common ones, and call two documents similar when they share unusual vocabulary. Two additions carry most of its strength. It reads the comments as well as the issue text, which are twice the volume and worth about seven points. And it lifts whatever its top three hits already link to.

## How it's graded

> Every time someone writes `#123` in an issue, they're asserting that two issues are related. A judgement someone already made, recorded and free.

My forge already had hundreds of them, so the test writes itself: hide the reference, show the system only the new issue's text, and ask whether it finds the issue the author linked - searching only issues that existed at the time, so nothing borrows from the future.

<button class="img-zoom" type="button" data-full="/images/local-models-answer-key.svg">
  <img src="/images/local-models-answer-key.svg" alt="Three steps. One, issue 968 cites issue 956, so someone has already said the two are related. Two, strip the reference, so the tool sees the text and never the link. Three, search only the issues that existed when 968 was filed, and count it a hit if 956 comes back in the first five." />
</button>
<p class="img-caption">#968 is a real one: it names #956 in its own body, so that pair is one of them.</p>

## Results

The models I tried are a couple of hundred megabytes each, run without a graphics card, and keep the text on my own machines. Most are embedding models, which turn a document into a position in space so that similar things land near each other. A reranker instead reads the new issue and one candidate together and scores the pair. Each went against the same links, with the prompt format its authors specify.

<figure class="mchart" role="group" aria-label="Recall at 5 by method, in four groups. Two stages: counting words plus the links already between issues reaches 67.2 percent; blending in a neural model reaches 63.8 to 65.1, and the ms-marco-MiniLM-L-6-v2 reranker 49.4. Counting words alone: term weighting with comments reaches 63.8 percent, tuned BM25 62.8. Neural models on their own: the best, SPLADE, reaches 56.7 percent, and single-vector gte-small 46.0. Controls: recency 23.1 percent, random 2.6.">
  <div class="mchart-key">
    <span><i class="mchart-sw mchart-lex"></i>no model</span>
    <span><i class="mchart-sw mchart-emb"></i>neural model</span>
    <span><i class="mchart-sw mchart-ctl"></i>baseline to beat</span>
  </div>
  <div class="mchart-group">Counting words, then a second pass</div>
  <div class="mchart-row">
    <div class="mchart-label">+ links already there*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:67.2%"></div></div>
    <div class="mchart-val">67.2%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ <a href="https://huggingface.co/naver/splade-cocondenser-ensembledistil">SPLADE</a>*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:65.1%"></div></div>
    <div class="mchart-val">65.1%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ <a href="https://huggingface.co/Qwen/Qwen3-Embedding-0.6B">Qwen3-Embedding</a>*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:64.0%"></div></div>
    <div class="mchart-val">64.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ <a href="https://huggingface.co/lightonai/GTE-ModernColBERT-v1">GTE-ModernColBERT</a>*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:64.1%"></div></div>
    <div class="mchart-val">64.1%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ <a href="https://huggingface.co/thenlper/gte-small">gte-small</a>*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:64.0%"></div></div>
    <div class="mchart-val">64.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ <a href="https://huggingface.co/answerdotai/answerai-colbert-small-v1">answerai-colbert-small</a>*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:63.8%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">+ <a href="https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2">ms-marco-MiniLM-L-6-v2</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:49.4%"></div></div>
    <div class="mchart-val">49.4%</div>
  </div>
  <div class="mchart-group">Counting words</div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words + comments</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:63.8%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Stemmed</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:63.8%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">BM25 + comments, tuned*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:62.8%"></div></div>
    <div class="mchart-val">62.8%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Query likelihood*</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:62.5%"></div></div>
    <div class="mchart-val">62.5%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Identifiers kept whole</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:61.9%"></div></div>
    <div class="mchart-val">61.9%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:57.0%"></div></div>
    <div class="mchart-val">57.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Counting words + topics</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:56.3%"></div></div>
    <div class="mchart-val">56.3%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Character patterns</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:55.0%"></div></div>
    <div class="mchart-val">55.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">BM25, untuned</div>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:47.6%"></div></div>
    <div class="mchart-val">47.6%</div>
  </div>
  <div class="mchart-group">Neural models on their own</div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/naver/splade-cocondenser-ensembledistil">SPLADE</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:56.7%"></div></div>
    <div class="mchart-val">56.7%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/Qwen/Qwen3-Embedding-0.6B">Qwen3-Embedding-0.6B</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:56.2%"></div></div>
    <div class="mchart-val">56.2%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/answerdotai/answerai-colbert-small-v1">answerai-colbert-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:54.4%"></div></div>
    <div class="mchart-val">54.4%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/lightonai/GTE-ModernColBERT-v1">GTE-ModernColBERT</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:52.6%"></div></div>
    <div class="mchart-val">52.6%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/thenlper/gte-small">gte-small</a>, by passage</div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:51.1%"></div></div>
    <div class="mchart-val">51.1%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/thenlper/gte-small">gte-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:46.0%"></div></div>
    <div class="mchart-val">46.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/intfloat/multilingual-e5-small">multilingual-e5-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:44.0%"></div></div>
    <div class="mchart-val">44.0%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/BAAI/bge-small-en-v1.5">bge-small-en-v1.5</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:43.7%"></div></div>
    <div class="mchart-val">43.7%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label"><a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:41.0%"></div></div>
    <div class="mchart-val">41.0%</div>
  </div>
  <div class="mchart-group">Controls</div>
  <div class="mchart-row">
    <div class="mchart-label">Five most recent</div>
    <div class="mchart-track"><div class="mchart-bar mchart-ctl" style="width:23.1%"></div></div>
    <div class="mchart-val">23.1%</div>
  </div>
  <div class="mchart-row">
    <div class="mchart-label">Random</div>
    <div class="mchart-track"><div class="mchart-bar mchart-ctl" style="width:2.6%"></div></div>
    <div class="mchart-val">2.6%</div>
  </div>
  <figcaption class="mchart-cap">How often the issue someone actually linked shows up in the first five suggestions. Measured on a copy of the forge frozen on 2026-09-24. * settings picked on the older three quarters of the links.</figcaption>
</figure>

Counting words beat every model, and not narrowly. The best on its own, SPLADE, came within seven points; blending any of them into the word counting added a point or two at most. What did add something was structure rather than language. A decision, its follow-ups and the fix that later undid it cite each other, so one good hit pulls in siblings that share few words with the new issue.

The likeliest reason is what my issues are made of: identifiers like `StateDirectory`, `checks/service-state.nix` and machine names. Exact matching on a rare string is what counting words does best and what a model trained on ordinary prose does worst. The model is better at language. My text is barely language.

<button class="img-zoom" type="button" data-full="/images/local-models-vocabulary.svg">
  <img src="/images/local-models-vocabulary.svg" alt="An issue from the forge with its words shaded by how many of the forge's issues contained them when I measured. The rarest are identifiers: checks/service-state.nix appears in 14, StateDirectory in 13, census in 5, packaged in 2 and rowless-unit in 1. The ordinary English words around them appear in hundreds." />
</button>
<p class="img-caption">One issue, shaded by how many of the forge's issues contained each word when I measured. <code>checks/service-state.nix</code> was in 14 of them, <code>StateDirectory</code> in 13, <code>rowless-unit</code> in exactly one. Those carry the sentence, and they are the strings a model trained on English has never seen. Rarity is measured against this forge rather than against English, which is why "fewer" is blue too.</p>

## What else I tried

- **Reading the whole issue.** Splitting each issue and its comments into passages and scoring the best one lifted gte-small from 46.0% to 51.1%, still twelve points short.
- **Rerankers.** Given whole issues, comments included, ms-marco-MiniLM-L-6-v2 reordered counting words' top twenty and landed fourteen points below the order it started from. A larger one, bge-reranker-base, did worse still on the first quarter of the queries, fifteen points below counting words there, and I stopped it.
- **A newer, larger model.** Qwen3-Embedding-0.6B was the best single-vector model here at 56.2%, five points above gte-small and still seven below counting words; blended in, it added nothing.
- **Rewriting identifiers into words.** Turning `checks/service-state.nix` into "checks service state nix" before the model read it changed nothing: gte-small stayed at about 51%. Making the identifiers readable isn't enough; what counting words exploits is that the exact string is rare.
- **Teaching a model my vocabulary.** Fine-tuned on my own linked pairs, a model went from 37.7% to 40.9% on links it had never seen - inside the noise - against 48.7% for counting words on the same held-back slice.
- **A learned ranker** over every score on this page matched the link rule, and taking the neural scores out of it changed nothing.
- **Word translations learned from my links.** Which words in a new issue predict which words in the one it cites? Built from the older links, the tables filled up with ports, timestamps and commit hashes, and moved one link.
- **Labels and pull requests.** Two linked issues share a host label three times in four, and most issues are named by a pull request, but both repeat what the text and links already say.
- **Another corpus.** On my notes vault, graded against its wikilinks, counting words beat all four embedding models in the same order. I'd predicted the opposite for prose; my notes turn out to be short and full of names, closer to the forge than I'd assumed.
- **A model that decides.** Before any of this I tried predicting who should act on an issue, in the shape of [Jev](https://typesafe.ai/): act when confident, escalate when not. Four issues in five are labelled within a minute of being filed, so there was no decision left for a model to take.

## How sure I am

The link rule's two settings were picked on links written before 22 September. On the links written after that, which didn't exist when the settings were chosen, it added about ten points. Re-tuned from scratch on small early slices it chooses badly, so it needs some history to tune on.

The answer key only credits links someone bothered to type, so the numbers are a floor on usefulness rather than a measure of precision. Most of those links were typed by agents that search by words, which could tilt the key toward counting words; the models lost among the links I wrote myself as well, and did no better on the pairs sharing the fewest words, so I don't think the key decided it.

The corpus is small and the largest models weren't tried, so nothing here says a big one would fail - code-trained retrieval models are the ones I'd most want to see. Every number is one run against a copy of the forge frozen on 2026-09-24. The copy has a checksum and the tool carries its own benchmark, so re-measuring takes seconds.

## What I'd tell anyone trying this

**Count your data before you run anything.** Two of my three candidate jobs turned out to have four usable examples each. Five minutes of counting would have shown it.

**Look for an answer key you already have.** Cross-references, stars, what you archived, what you clicked. If your own past behaviour is written down somewhere, you can grade a system instead of eyeballing it and hoping.

**The angle matters more than the model.** Same text, same machine: one framing failed completely and another produced something I use daily.

**Write the bar down before you run the test.** It's what turns a failure into a clear no rather than a negotiation with yourself.

## The limit it states itself

Something that finds a related issue about two thirds of the time **cannot be read as a clearance.** Checking it, seeing nothing, and concluding the question is new converts *I didn't look* into *I looked and it was clear*, which is worse than never having looked. So it says so on every run.
