---
title: What the config never sees
description: "A declared baseline plus a checker, for the host state deployment tools are blind to."
date: 2026-09-26
draft: true
unlisted: false
wip: false
---

My machines are built from a repository. I describe what a host should be, a tool makes the host match, and the host stays matched. That part works, and it is not what this is about.

What it is about is the other direction. Configuration management enforces what I declared, and it is structurally blind to whatever got added outside it. A service I never described installs itself, opens a port, writes state to a directory nothing captures, and nothing anywhere goes red. The tool is not broken. It was never asked.

The asymmetry is worth stating plainly, because it is why this class of problem gets missed for months at a time:

> When software is **removed**, something referencing it breaks loudly. When software is **added**, nothing breaks.

A database I depended on failed once and I knew within minutes, because everything downstream of it started shouting. The opposite case has no downstream. A new service writing state nobody backed up produces no failure at all until a restore, which is the one moment it cannot be fixed.

## The shape

I have now built the same answer six or seven times without noticing I had a pattern. It is two files.

A **declared baseline**: a JSON file in the repository saying what this class of thing should look like, per host. A **checker**: a small script wired into the nightly health checks that reads the live state, compares it against the baseline, and prints one line per thing it cannot account for.

The part that makes it work is not the comparison. It is that the baseline is a **decision log, not an inventory**. For backup coverage, one key records where a service's state gets captured and another records *why* a directory needs no capturing. Either answer silences the check. Only an unclassified directory reports.

That inverts who does the work. An inventory rots, because keeping it accurate is a chore with no deadline and no feedback. A decision log cannot rot quietly: anything undecided is on the report tomorrow morning. It also puts the question at the only moment anyone can answer it cheaply - once, in the commit that introduces the service, while the person adding it still knows what its state directory is for.

And it stays quiet by construction. A check that prints something every day is a check nobody reads, so silence has to be the normal output rather than a good day.

## The worked example

The one I would show first is a Syncthing audit, because Syncthing has the blindness built into it.

Syncthing keeps two kinds of configuration per device and syncs neither. Each folder's ignore rules live in a file on that host. Each folder's file-versioning lives in that host's own config. So a host rebuild silently drops both, and the loss looks exactly like a folder that never had them.

The two halves needed different comparisons, and that turned out to be the interesting part.

**Ignore rules get compared between hosts.** They are meant to be identical across devices, and there is no correct value to write down - so the hosts are each other's reference. Every host agreeing is the only definition of right available.

**Versioning gets compared against a declaration.** Here the hosts legitimately differ. Some folders keep a year of versions on the servers and none on a family PC, on purpose. Nothing can be inferred from disagreement, so only a declared baseline can say what is right.

Both were wrong when the check first ran. One folder ignored a database file by name, which did not match the two sidecar files SQLite keeps beside it, so those replicated across four copies of that folder for months. Nobody found it by noticing a symptom; somebody found it by happening to look. Three other folders were at no versioning at all on every host, while my own notes said ninety days, with no surviving backup of the config to say whether that had regressed or had never been applied.

The two comparison surfaces also produce different repairs, and I think that is the real lesson rather than a detail. Versioning is fixed by writing the declared value back, so the checker can do it, and a rebuilt machine can repair itself from the repository. Which copy of an ignore file is *right* is a judgement, so that half only ever reports. A checker that writes should write exactly the things a file has already decided, and nothing else.

## Three states, not two

The mistake I most want to keep having fixed is a checker with two exit states.

Clean and drifted are not enough, because "I could not look" is a third thing and it resembles both. A checker of mine used to report an unreadable baseline as drift, so a run that had verified nothing paged with the words *versioning drifted* on it. The actual cause - the nightly check runs as root, whose home directory holds neither the repository nor the config it needed - sat behind that wording for as long as it took somebody to read past the subject line.

So the contract is three-valued now, and every checker I write uses it:

| exit | meaning | what to do |
| --- | --- | --- |
| 0 | compared, everything matches | nothing |
| 1 | compared, these things differ | act on the output |
| 2 | could not compare | the result means nothing, fix the check |

Anything unreadable outranks anything found. A partial comparison does not make the part it managed to do trustworthy.

There is a second direction to the same rule, and it points the opposite way. When a probe reads several directories and *none* of them can be read, the honest answer is not "this host has no state" - it is that the probe is broken. Returning an empty finding set there would be fine. Returning a list of everything as unclassified would be worse than useless: run it by hand as the wrong user and it invents a whole fleet of problems that do not exist. Unreadable skips. It never guesses in either direction.

## The check has to be checked

Two failure modes here have nothing to do with the thing being checked.

The first is a comparison that is subtly wrong. My Syncthing check has to normalise ignore rules before comparing them, because one host's platform rewrites every rule to a case-insensitive form and the others do not - that is a fact about the filesystem, not about the file. Fold too little and all fifteen folders report as drifted with every rule listed twice, which is precisely the crying-wolf failure that gets a check switched off. Fold too much and real differences read as identical, which is silent. Both directions fail quietly, so the normalisation carries a self-test with fixtures: no network, no hosts, just the assertions that it collapses what it should and keeps what changes behaviour.

The self-test also pins the read and write halves against each other, because they are one format seen from two sides. If they disagree, the repair writes back something the next check reports as drift again, and you have a checker that can never reach clean.

The second failure mode is worse and duller: a check that does not run. Several of mine were called through a guard that asked whether the binary was present. When the binary stopped being present, the guard was simply false - every night, no output, no alert, nothing at all saying a check had stopped checking. A dead guard is the worst version of this, because in a review it looks like coverage.

The fix is one branch. If the tool is missing, that is itself the alert: *nothing on this host is being checked, and here is the file to fix.* Absent and clean must never share an output.

## When it is the wrong tool

Two of these checkers should not exist, and both stories are more useful to me than the successes.

**The ignore rules were upstream's problem, and upstream had already solved it.** I wrote a cross-host comparison because the shared rules lived in a file the tool does not propagate. It turned out there was a supported place to put them that *is* propagated. Moving them there fixed the drift the script was written for, with no checker involved. Before building a comparison, it is worth a few minutes on whether the thing could simply sync itself.

That move left a narrower version of the problem, which is the honest footnote. If a divergent copy now replicates to every peer, all hosts agree and the cross-host check reports clean. The only angle that sees it is comparing a host's folders against each other. The pattern moved rather than going away, and the check that catches it now had to be rewritten to look sideways.

**Two others died when the declaration moved.** I had a checker for security posture - that password authentication had not been switched back on, that the firewall had not been flushed by hand - and another for scheduled jobs. Both were written when those things were configured imperatively. Once the whole system was generated from the repository, the regression class they watched could not survive a deploy, and a single command answered "has this host diverged from what the tree says" by comparing the entire system at once.

They were not repaired. They were removed, and one of them left behind the dead guard described above for a while, which is how I found out that deleting a call site matters more than deleting a script.

---

The pattern is worth the two files whenever live state can gain something nobody declared, and the gain is silent. It is worth nothing at all when the declaration already covers it, and a check that duplicates the deploy is just a second place to keep the truth.
