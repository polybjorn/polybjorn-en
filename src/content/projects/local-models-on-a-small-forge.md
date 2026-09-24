---
title: "Four embedding models lost to counting words"
description: "A local-model experiment on a 489-issue forge, and the four times the result reversed. The useful finding was not about models."
date: 2026-09-25
draft: true
---

The question was narrow: does a small embedding model, running locally, do useful work on a self-hosted forge with a few hundred issues on it? No use case was committed in advance. The first run was chosen because it had an answer key.

It reversed four times. The leaderboard at the end is the least interesting part.

## First reversal: the task had no gap in it

The plan was to predict the triage label a new issue gets - whether it is safe for an unattended agent, whether it needs a decision from a person, whether it is blocked - with a confidence honest enough to act on above a threshold and escalate below it. The pass bar was fixed in writing before anything ran: at 0.9 or better confidence, 90% correct, covering at least 30% of held-out issues.

Term counting plus a calibrated logistic regression reached **2.4% coverage** at that confidence. Precision inside the band was fine. The model was simply almost never confident.

The reason turned out to be structural rather than a matter of model size. Timestamps on 333 labelled issues:

```
delay from issue creation to first triage label
  same second      56.5%
  under 60s        23.4%    -> 79.9% within a minute
  over 1 day        5.1%
```

Four issues in five were labelled by whoever filed them, in the same breath as filing. Predicting that label from the text means predicting the filer's own intent at a moment when the filer already holds it. There was no decision sitting there waiting to be automated, so there was nothing for a larger model to recover. Only 46 issues of 333 were labelled more than an hour after filing, and that is the entire population where a second party ever triaged anything.

## Second reversal: two of the three candidates could not be scored at all

The original plan listed three tasks. Sizing the other two took about five minutes and should have happened before any model ran:

```
triage label       333 examples
duplicate check      4 genuine pairs
alert noise          4 machine-filed issues
```

Fifty-six comments in the repo carried duplicate or supersede language, which made duplicate detection look viable. Reading them, almost all were one *finding* superseding another rather than one issue duplicating another, and several referenced an upstream project's issue numbers rather than this forge's. Four pairs cannot score a retrieval system.

That is a fact about the corpus, not about embeddings: under 500 issues, written carefully, with few duplicates because the filing convention works. The only task with enough data was the one with the least signal in its text.

An answer key is what proves a duplicate finder works. It is not what makes one useful. Those are different verdicts and merging them was a mistake worth naming.

## Third reversal: the task that worked was not on the list

Every `#N` that someone types in an issue body is a human assertion that two issues are related. There were **616** of them.

That is a free answer key for a different question: given a new issue, retrieve the earlier issues a person would have linked. Hide the references, show the tool only the new text, and ask whether the issue that was actually cited comes back in the top five.

It worked immediately, with no model involved:

```
                            recall@5
tfidf + comments             63.8%
LSA-200 + comments           53.2%   (title-only query)
recency baseline             23.1%
random                        2.6%
```

Recency is the control that matters. References skew recent, so beating random proves nothing and beating "show the five newest issues" proves something.

The single largest improvement came from text that was already there. Comments on this forge are **2.18 times** the volume of the issue bodies, and nothing had been indexing them. Adding them moved a title-only query from 48.3% to 53.2%.

## Fourth reversal: the models lost, against a written prediction

Four local embedding models were then measured on the same links, with each model's required prompt format applied, because a model used wrongly reads as a weak model:

```
                            recall@5
tfidf + comments             63.8%
tfidf, body only             57.0%
LSA-200 + comments           53.2%
gte-small                    37.7%
bge-small-en-v1.5            36.1%
multilingual-e5-small        34.3%
all-MiniLM-L6-v2             31.6%
```

The prediction on record before that run was that the models would win. They lost by roughly ten points, and the obvious objections do not rescue them. Truncation was not the handicap: chunking each candidate and taking the best-matching chunk made every model worse, gte-small from 37.7% to 34.8%. Fusion did not rescue it either, which is how dense retrieval is normally deployed - combining gte-small with LSA by reciprocal rank fusion scored 46.3%, below LSA's own 48.3% on that query form.

In hindsight the reason is plain. The signal in these issues is identifiers: metric names, file paths under `checks/`, hostnames. Exact matching finds those, and exact matching is the thing term weighting does optimally and dense retrievers do worst. A model trained on ordinary prose has never seen the identifier and maps it to nothing in particular.

There is a second point hiding in that table. Both winning methods are fitted on this corpus - term weights computed from these issues, and in the LSA case a decomposition learned from them. The bought models were trained on the internet. The homemade statistical model beat the general-purpose neural ones because it had seen the vocabulary, which is a more useful lesson than the ranking.

## Making the next number mean something

The 616 references are both the obvious training signal and the scoring key, so any future model has to be trained and scored on different halves or the result is worthless. The corpus was frozen and the links split before any model touched them:

```
snapshot  489 issues, 1060 issue comments, 616 links
split     time-based on the citing issue's date
train     462 links       test  154 links
```

Time-based rather than random, because the real task predicts forward and because two references from one issue would otherwise straddle the split.

On the held-out quarter alone the same method scores **56.5%**, and that is the number any future model has to beat. It is not a worse result, it is a harder slice: the recency control falls from 23.1% to 18.2% over the same change, and the ratio between method and control holds steady. Both moving together is what a harder test set looks like. The method falling on its own would have meant a broken measurement.

## What the limits actually are

The answer key credits only references that somebody bothered to type. One issue about journal entries failing to arrive carried no reference at all, so every result for it counted as a miss - including the one obviously correct earlier issue about the same subsystem, which ranked first. The figures are therefore a floor on usefulness rather than a precision measurement, and a hand check of the output is the only thing that answers whether it helps.

The corpus is under 500 issues. The largest models were never tried, so nothing here says a much bigger embedding model would fail, only that four small ones did and that vocabulary rather than capacity was the reason. And the tool that came out of this has no way to appear at the moment an issue is filed, because the forge refuses webhook registration to the account that would need it. It is a command someone has to remember to run, which is the weakest thing about it.

One more limit deserves stating plainly, because it is the failure this kind of tool introduces. A lookup that finds a genuinely related issue about two thirds of the time cannot be read as a clearance. Checking it, seeing nothing and concluding the question is new converts "I did not look" into "I looked and it was clear", which is worse than not having looked. The tool prints that warning on every run.

## The through-line

The angle mattered roughly twenty times more than the model. The same corpus, the same machine and no model at all produced a failure and then a success, purely by changing what was being asked. The largest single gain came from indexing text that had been sitting there the whole time.

The cheapest thing that was skipped was counting the rows in each candidate task before running any of them.
