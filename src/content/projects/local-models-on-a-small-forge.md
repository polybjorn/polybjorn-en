---
title: Finding what I wrote before
description: "Local AI models against plain word counting on a Git forge, graded on cross-references already there."
date: 2026-09-25
updated: 2026-09-27
wip: true
thumb: /images/local-models-thumb.svg
thumbAlt: An unlabelled bar chart, one long blue bar above four shorter amber ones and a short grey one
draft: false
unlisted: false
---

After reading about [Jev](https://typesafe.ai/), I wanted to know if small AI models running on my own hardware could do useful work on my Git forge. I kept settling questions there, forgetting I had, and asking them again weeks later, so the first test was whether a model could remind me. So far, a fifty-year-old way of counting words does it better than any of them.

The tool I ended up with works like this. I describe a new problem in one line, and it lists the old issues I should read first. Here the problem was that after a reboot, one of my servers sent its whole log history again.

<pre><code>$ issue-related "systemd-journal-upload cursor lost after reboot, journal replays"

  #956   0.14  hypervisor: no journal entries reached VictoriaLogs in 15m
  #968   0.10  checks: service-state cannot see a StateDirectory from a packaged unit
<span style="color:#8b949e">
ranked by term overlap, then by links from the top hits; it misses about
a third of real links, so an absent issue here is not a clearance</span></code></pre>

Both were the right things to read, and I'd forgotten both. It finds the issue I actually needed in its top five about two times in three. Showing the five newest issues instead manages about one in four, and picking at random almost never.

That also means it **cannot be read as a clearance.** Checking it, seeing nothing, and concluding the question is new converts *I didn't look* into *I looked and it was clear*, which is worse than never having looked. So it says so on every run.

Underneath is [TF-IDF](https://en.wikipedia.org/wiki/Tf%E2%80%93idf). It counts the words in every document, weights rare words above common ones, and calls two documents similar when they share unusual vocabulary. Two additions carry most of its strength. It reads the comments as well as the issue text, which are twice the volume and worth about seven points. And it lifts whatever its top three hits already link to.

## How I graded it

Grading needed an answer key, and the forge already had one. Whenever I mention an old issue in a new one, I'm recording that the two are related. So the test hides that mention, gives the system only the new issue's text, and lets it search only the issues that existed when the new one was written. If the issue I actually linked comes back in the first five, that counts as a hit.

The models I tried are all small enough to run on a laptop. Most turn each issue into a position in space, so that similar issues land near each other, and suggest the nearest ones. The chart shows each model on its own, and again as a second pass over what counting words found.

<figure class="mchart" role="group" aria-label="Recall at 5 by method, in four groups. Two stages: counting words plus the links already between issues reaches 67.2 percent; blending in a neural model reaches 63.8 to 65.1, and the ms-marco-MiniLM-L-6-v2 reranker 49.4. Counting words alone: term weighting with comments reaches 63.8 percent, tuned BM25 62.8. Neural models on their own: the best, SPLADE, reaches 56.7 percent, and single-vector gte-small 46.0. Controls: recency 23.1 percent, random 2.6. Each row also gives the time to work through the forge once on my server's processor, from under a second for counting words to 55 minutes for Qwen3-Embedding.">
  <div class="mchart-head">
    <div class="mchart-key">
      <span><i class="mchart-sw mchart-lex"></i>no model</span>
      <span><i class="mchart-sw mchart-emb"></i>neural model</span>
      <span><i class="mchart-sw mchart-ctl"></i>baseline to beat</span>
    </div>
    <details class="mchart-modes" hidden>
      <summary class="mchart-current" aria-label="what the bars show">quality</summary>
      <div class="mchart-list">
        <button type="button" data-mode="recall" aria-pressed="true">quality</button>
        <button type="button" data-mode="speed" aria-pressed="false">speed</button>
      </div>
    </details>
  </div>
  <div class="mchart-group">Counting words, then a second pass</div>
  <div class="mchart-row" data-recall="67.2" data-secs="0.4">
    <div class="mchart-label">+ <span class="mchart-tip" tabindex="0" aria-describedby="mtip1">links already there</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip1">Issues the top three hits already link to are moved up.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:67.2%"></div></div>
    <div class="mchart-val">67.2%</div>
  </div>
  <div class="mchart-row" data-recall="65.1" data-secs="132">
    <div class="mchart-label">+ <a href="https://huggingface.co/naver/splade-cocondenser-ensembledistil">SPLADE</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:65.1%"></div></div>
    <div class="mchart-val">65.1%</div>
  </div>
  <div class="mchart-row" data-recall="64.1" data-secs="161">
    <div class="mchart-label">+ <a href="https://huggingface.co/lightonai/GTE-ModernColBERT-v1">GTE-ModernColBERT</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:64.1%"></div></div>
    <div class="mchart-val">64.1%</div>
  </div>
  <div class="mchart-row" data-recall="64.0" data-secs="3294">
    <div class="mchart-label">+ <a href="https://huggingface.co/Qwen/Qwen3-Embedding-0.6B">Qwen3-Embedding</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:64.0%"></div></div>
    <div class="mchart-val">64.0%</div>
  </div>
  <div class="mchart-row" data-recall="64.0" data-secs="295">
    <div class="mchart-label">+ <a href="https://huggingface.co/thenlper/gte-small">gte-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:64.0%"></div></div>
    <div class="mchart-val">64.0%</div>
  </div>
  <div class="mchart-row" data-recall="63.8" data-secs="69">
    <div class="mchart-label">+ <a href="https://huggingface.co/answerdotai/answerai-colbert-small-v1">answerai-colbert-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:63.8%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row" data-recall="49.4" data-secs="485">
    <div class="mchart-label">+ <a href="https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2">ms-marco-MiniLM-L-6-v2</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:49.4%"></div></div>
    <div class="mchart-val">49.4%</div>
  </div>
  <div class="mchart-group">Counting words</div>
  <div class="mchart-row" data-recall="63.8" data-secs="0.5">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip3">Counting words + comments</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip3">Counting words over each issue plus all its comments.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:63.8%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row" data-recall="63.8" data-secs="2.9">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip4">Stemmed</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip4">Counting words with comments, after cutting words to their stem so restart, restarts and restarted match (a light Porter stemmer).</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:63.8%"></div></div>
    <div class="mchart-val">63.8%</div>
  </div>
  <div class="mchart-row" data-recall="62.8" data-secs="0.3">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip5">BM25 + comments, tuned</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip5">A refined version of counting words that stops a repeated word from dominating and evens out long and short issues (BM25F). Titles weighted up and comments down.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:62.8%"></div></div>
    <div class="mchart-val">62.8%</div>
  </div>
  <div class="mchart-row" data-recall="62.5" data-secs="0.3">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip7">Query likelihood</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip7">Asks how likely each old issue&#39;s words are to have produced the new one&#39;s, comments included (a Dirichlet-smoothed language model).</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:62.5%"></div></div>
    <div class="mchart-val">62.5%</div>
  </div>
  <div class="mchart-row" data-recall="61.9" data-secs="0.5">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip9">Identifiers kept whole</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip9">Counting words with comments, but names like checks/service-state.nix stay one word instead of four.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:61.9%"></div></div>
    <div class="mchart-val">61.9%</div>
  </div>
  <div class="mchart-row" data-recall="57.0" data-secs="0.3">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip10">Counting words</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip10">Scores the words two issues share, with rare words counting more than common ones (TF-IDF). Issue text only, no comments.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:57.0%"></div></div>
    <div class="mchart-val">57.0%</div>
  </div>
  <div class="mchart-row" data-recall="56.3" data-secs="2.1">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip11">Counting words + topics</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip11">Counting words, blended with a model of which words tend to appear together (LSA).</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:56.3%"></div></div>
    <div class="mchart-val">56.3%</div>
  </div>
  <div class="mchart-row" data-recall="55.0" data-secs="4.6">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip12">Character patterns</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip12">Counts short runs of letters instead of whole words, so partial matches count (character n-grams).</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:55.0%"></div></div>
    <div class="mchart-val">55.0%</div>
  </div>
  <div class="mchart-row" data-recall="47.6" data-secs="0.24">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip13">BM25, untuned</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip13">A refined version of counting words, with its textbook settings (BM25, k1 = 1.2 and b = 0.75).</span>
    <div class="mchart-track"><div class="mchart-bar mchart-lex" style="width:47.6%"></div></div>
    <div class="mchart-val">47.6%</div>
  </div>
  <div class="mchart-group">Neural models on their own</div>
  <div class="mchart-row" data-recall="56.7" data-secs="132">
    <div class="mchart-label"><a href="https://huggingface.co/naver/splade-cocondenser-ensembledistil">SPLADE</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:56.7%"></div></div>
    <div class="mchart-val">56.7%</div>
  </div>
  <div class="mchart-row" data-recall="56.2" data-secs="3294">
    <div class="mchart-label"><a href="https://huggingface.co/Qwen/Qwen3-Embedding-0.6B">Qwen3-Embedding-0.6B</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:56.2%"></div></div>
    <div class="mchart-val">56.2%</div>
  </div>
  <div class="mchart-row" data-recall="54.4" data-secs="69">
    <div class="mchart-label"><a href="https://huggingface.co/answerdotai/answerai-colbert-small-v1">answerai-colbert-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:54.4%"></div></div>
    <div class="mchart-val">54.4%</div>
  </div>
  <div class="mchart-row" data-recall="52.6" data-secs="161">
    <div class="mchart-label"><a href="https://huggingface.co/lightonai/GTE-ModernColBERT-v1">GTE-ModernColBERT</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:52.6%"></div></div>
    <div class="mchart-val">52.6%</div>
  </div>
  <div class="mchart-row" data-recall="51.1" data-secs="915">
    <div class="mchart-label"><a href="https://huggingface.co/thenlper/gte-small">gte-small</a>, <span class="mchart-tip" tabindex="0" aria-describedby="mtip21">by passage</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip21">Each issue and its comments split into passages, and the issue scored by its best one.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:51.1%"></div></div>
    <div class="mchart-val">51.1%</div>
  </div>
  <div class="mchart-row" data-recall="46.0" data-secs="295">
    <div class="mchart-label"><a href="https://huggingface.co/thenlper/gte-small">gte-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:46.0%"></div></div>
    <div class="mchart-val">46.0%</div>
  </div>
  <div class="mchart-row" data-recall="44.0" data-secs="80">
    <div class="mchart-label"><a href="https://huggingface.co/intfloat/multilingual-e5-small">multilingual-e5-small</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:44.0%"></div></div>
    <div class="mchart-val">44.0%</div>
  </div>
  <div class="mchart-row" data-recall="43.7" data-secs="46">
    <div class="mchart-label"><a href="https://huggingface.co/BAAI/bge-small-en-v1.5">bge-small-en-v1.5</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:43.7%"></div></div>
    <div class="mchart-val">43.7%</div>
  </div>
  <div class="mchart-row" data-recall="41.0" data-secs="42">
    <div class="mchart-label"><a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2</a></div>
    <div class="mchart-track"><div class="mchart-bar mchart-emb" style="width:41.0%"></div></div>
    <div class="mchart-val">41.0%</div>
  </div>
  <div class="mchart-group">Controls</div>
  <div class="mchart-row" data-recall="23.1">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip14">Five most recent</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip14">Always the five newest issues, which is what a plain issue list shows.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-ctl" style="width:23.1%"></div></div>
    <div class="mchart-val">23.1%</div>
  </div>
  <div class="mchart-row" data-recall="2.6">
    <div class="mchart-label"><span class="mchart-tip" tabindex="0" aria-describedby="mtip15">Random</span></div><span class="mchart-tipbox" role="tooltip" tabindex="-1" id="mtip15">Five issues at random.</span>
    <div class="mchart-track"><div class="mchart-bar mchart-ctl" style="width:2.6%"></div></div>
    <div class="mchart-val">2.6%</div>
  </div>
  <figcaption class="mchart-cap">How often the issue someone actually linked shows up in the first five suggestions. The other view shows how long each one takes to work through the forge once, on a scale where every step is ten times the last.</figcaption>
</figure>

Counting words beat every model. The best one on its own, SPLADE, was seven points behind, and blending any of them into counting words added a point or two at most. What did help was structure rather than language. A decision, its follow-ups and the fix that later undid it tend to link to each other, so one good hit pulls in related issues that share few words with the new one.

The likeliest reason is what my issues are made of. They're full of exact names, like `StateDirectory`, `checks/service-state.nix` and the names of my machines. Matching a rare string exactly is what counting words does best, and what a model trained on ordinary prose does worst.

<figure class="vocab">
  <div class="vocab-issue">
    <div class="vocab-title"><span class="v-mid">checks:</span><span class="v-rare"> service-state</span><span class="v-common"> cannot</span><span class="v-mid"> see</span><span class="v-common"> a</span><span class="v-rare"> StateDirectory</span><span class="v-common"> from</span><span class="v-common"> a</span><span class="v-rare"> packaged</span><span class="v-mid"> unit</span></div>
    <div class="vocab-body"><span class="v-rare">checks/service-state.nix</span><span class="v-common"> cannot</span><span class="v-mid"> see</span><span class="v-common"> a</span><span class="v-rare"> StateDirectory=</span><span class="v-common"> that</span><span class="v-mid"> comes</span><span class="v-common"> from</span><span class="v-common"> a</span><span class="v-rare"> PACKAGED</span><span class="v-mid"> unit</span><span class="v-common"> file,</span><span class="v-common"> so</span><span class="v-common"> the</span><span class="v-rare"> rowless-unit</span><span class="v-rare"> census</span><span class="v-mid"> added</span><span class="v-mid"> asks</span><span class="v-common"> its</span><span class="v-mid"> question</span><span class="v-common"> of</span><span class="v-rare"> fewer</span><span class="v-mid"> units</span><span class="v-common"> than</span><span class="v-common"> the</span><span class="v-common"> host</span><span class="v-common"> has.</span></div>
    <div class="vocab-key">
      <span><i class="vocab-sw sw-rare"></i>in up to 20 issues</span>
      <span><i class="vocab-sw sw-mid"></i>21 to 150</span>
      <span><i class="vocab-sw sw-common"></i>more than 150</span>
    </div>
  </div>
  <figcaption class="vocab-cap">Rarity is counted across this forge&#39;s 489 issues, not across English, so a plain word like &quot;fewer&quot; comes out rare.</figcaption>
</figure>

Where a method had settings to tune, I tuned them on older links and checked them on newer ones, so the results aren't just fitted to the answers. The answer key only counts links someone bothered to write, so a useful suggestion can still score as a miss, and the real numbers are probably a little higher. Most of those links were written by the AI coding agents I run, which search by keyword and might favour counting words, but the models lost on the links I wrote myself too.

The forge is small and I didn't try the largest models, so none of this says a big model would fail.

## What else I tried

Most of what I tried was aimed at giving the models a fairer chance. Letting them read the whole issue in passages, instead of only its start, lifted gte-small five points. Rewriting `checks/service-state.nix` into plain words changed nothing. Fine-tuning a model on my own linked pairs moved it three points, inside the noise. Qwen3-Embedding-0.6B, newer and larger, was the best single-vector model, and the rerankers, which read the new issue and each candidate together, made the order worse. None of it closed the gap.

To check the result wasn't peculiar to this forge, I ran the same comparison on my notes vault, graded against its wikilinks. Counting words won there too, in the same order. I'd expected prose to favour the models, but my notes are short and full of names, much like the forge.

Before any of this I aimed a model at my labels, predicting who should act on an issue and escalating when unsure. Four issues in five are labelled within a minute of being filed, so there was no decision left for a model to take. Five minutes of counting would have told me that before I built anything.

So for this job the models came close but didn't earn their place, and they cost far more. Counting words runs the whole test in under a minute with nothing to download. The small models needed a few minutes to process the forge, and the largest took about seven and a half hours on my server's processor. Here the cheapest method is also the best one.

The models aren't bad at language; my issues just aren't much language. The models I'd most like to try next are ones trained on code, which have seen strings like these before.
