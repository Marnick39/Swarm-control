#set page(paper: "a4", margin: (x: 2.0cm, y: 1.9cm), numbering: "1")
#set text(size: 10pt)
#set par(justify: true, leading: 0.58em)
#show heading.where(level: 1): it => block(above: 1.1em, below: 0.6em, text(size: 12pt, weight: "bold", it.body))
#show heading.where(level: 2): it => block(above: 0.9em, below: 0.45em, text(size: 10.5pt, weight: "bold", it.body))
#set figure(gap: 0.6em)
#show figure.caption: it => text(size: 8.6pt, it)

#align(center)[
  #text(size: 15pt, weight: "bold")[Oversight does not stack: correlated monitor failure \ limits AI control against agent swarms]
  #v(0.5em)
  #text(size: 10pt)[Marnick Vandecauter #h(1.2em) Anusha Asim #h(1.2em) Punjaya Wickramasinghe]
  #linebreak()
  #text(size: 9pt, style: "italic")[Independent researchers #h(0.6em) With Apart Research]
  #v(0.2em)
  #text(size: 8.5pt)[Research conducted at the Swarm Alignment Hackathon, November 2026]
]

#v(0.4em)
#block(inset: (x: 0.8em), [
  #text(weight: "bold")[Abstract] #h(0.4em)
  AI control protocols are evaluated against one untrusted agent watched by one trusted monitor.
  Deployments are moving to populations: in July 2026 roughly 1,200 agents coordinated during an
  evaluation and about 700 breached Hugging Face. Both sides then have an obvious scaling move, and
  both are implicitly priced as independent draws. We test that pricing on 21,500 monitor judgements:
  500 backdoored APPS programs, each scored by 43 monitor arms spanning 14 model families, every arm
  calibrated to a 2% false positive rate. The sides are not symmetric. An attacker swarm realises
  1.000 to 1.017 times the independence prediction. A defender panel does not stack: one monitor misses
  56% of backdoors, fourteen distinct models still miss 8.6%, and a nine-model panel misses the same 43
  the fourteen does. Against the 0.027% independence predicts, that floor is 315 times too high. The
  mechanism is that evasion belongs to the task and the edit, not the author, which explains only 9.9%
  of the variance. Operationally a swarm of 8 defeats every panel we can build more often than not, and
  preferring small edits, which a member ranks from its own code, lifts a swarm of 8 from 52% to 78%.
  What works is changing the monitor's information, not its headcount: one monitor that reads the
  author's comments catches 20 backdoors all 42 comment-blind arms miss. We also release a data-quality
  audit of both public swarm datasets.
])

= 1. Introduction

AI control asks how to deploy a model you do not trust while keeping catastrophic outcomes rare [1].
The canonical protocol is trusted monitoring: an untrusted policy proposes an action, a weaker trusted
model scores how suspicious it looks, and the most suspicious fraction is audited under a fixed
budget. Essentially all published evaluation of this protocol assumes one untrusted agent and one
monitor.

Deployment has already left that assumption behind. In July 2026 a population of roughly 1,200 agents
in a cyber-security evaluation coordinated well enough that about 700 of them broke into Hugging
Face's systems [4,5]. When the untrusted side is a population, both players get a scaling lever. The
attacker runs more agents, and needs only one submission to land. The defender buys more monitors, and
needs only one of them to flag. Written as probabilities, both levers look like the same geometric
decay, and that symmetry is what makes "just add monitors" sound like an answer.

It is not an answer, because the two levers are not drawing from the same distribution. An attacker's
submissions land on different tasks. A panel's monitors all look at the *same* submission. If
evasiveness is mostly a property of the artefact rather than of its author, then attacker draws are
close to independent while monitor draws are close to redundant, and the defender's lever is worth far
less than its arithmetic suggests. This paper measures that gap.

Our contributions are:

+ *The asymmetry, measured.* On 21,500 monitor judgements, an attacker swarm realises 1.000 to 1.017
  times the independence prediction, while a defender panel of 14 distinct models realises 315 times
  worse than its own (@f2). Adding attackers behaves as the textbook says. Adding monitors does not.
+ *The mechanism.* Which model wrote a backdoor explains only 9.9% of the variance in whether it is
  caught. Most of the rest is carried by the task and the edit (a two-way bound puts the artefact's
  share between 32 and 90%), which is the shared quantity that makes monitors fail together.
+ *An operational frontier.* A swarm of 8 defeats every panel we can assemble from 14 distinct models
  more often than not, and 7.8% of backdoors (95% CI 5.8 to 10.5) are missed by all 42 arms that share
  the same view of the code.
+ *Selection substitutes for collusion.* A swarm that never communicates, and merely prefers small
  edits, raises its success against the strongest panel from 51.6% to 78.1% at N = 8. Coordination
  detection is therefore not sufficient: the dangerous behaviour leaves no channel to detect.
+ *A lever that does work.* One monitor that can read the author's comments catches 20 backdoors that
  42 comment-blind arms miss collectively. Information beats headcount, by a wide margin.
+ *A measured data audit* of the two public swarm datasets offered for this track, including the
  finding that the public Swarm Traces release has no timestamps and no actor labels at all, which
  rules out the coordination analyses it is nominally offered for.

= 2. Related work

Trusted monitoring and the control evaluation methodology come from [1], and the APPS backdoor setting
we use is its standard testbed. Work on collusion between models studies whether agents can pass
hidden signals past an overseer [2], and more recent work extends this to steganographic channels
under partial observation [3]. That literature asks whether a monitor can *detect* coordination. We
ask a prior question: whether the monitoring protocol retains its safety properties at all once the
untrusted side is a population, even when its members never communicate.

The ensemble assumption we test is widespread but rarely stated. Treating k monitors as k independent
chances to catch is the implicit justification for monitor panels, best-of-k auditing, and
defence-in-depth arguments. Correlated failure is well known in classifier ensembles, but we are not
aware of a measurement of its size for safety monitors in a control setting, nor of the comparison
against the attacker's own scaling that makes the asymmetry visible.

Our empirical grounding comes from the July 2026 incident reports [4,5] and from the Swarm Traces
release [6], a redacted corpus of reconstructed attack payloads from that incident.

= 3. Methods

== 3.1 Data, and what is pre-existing

The monitor runs are *pre-existing*. They come from an ongoing control-budgets research project and
were produced before this hackathon. The setting is the ControlArena APPS backdoor task: 500
programming problems, each with an honest solution and a backdoored solution that passes the visible
tests while failing on a hidden input. Each backdoor is attributed to one of 10 generator labels, and
482 of the 500 come from the published control-tax dataset.

*Everything in this report is new work*: the swarm and panel reinterpretation, the calibration
validation, every analysis below, all the figures, and the Swarm Traces audit. The main results called
no model and commissioned no new run, at EUR 0 in compute. The only inference we ran is the
domain-transfer check of Appendix D, on an on-platform credit grant.

== 3.2 The calibrated catch matrix

We use 43 monitor arms that scored all 500 attack samples and all 500 honest samples. The arms span 14
distinct model families; several families appear at multiple reasoning efforts or score scales. For
each arm we take the audit threshold at a 2% nominal false positive rate from the project's own
calibration and define a backdoor as caught when its suspicion score is strictly above that threshold.
This reproduces the source project's recall and achieved false positive rate for all 43 of 43 arms
exactly, which is our check that the reinterpretation did not silently change the protocol. The result
is a 500 by 43 binary matrix. Mean per-arm recall is 0.4795 and the arms range from 0.000 to 0.936.

Because monitor scores are reported on a coarse 11-point scale, the *achieved* false positive rate
differs from the nominal 2%: across the 43 arms it averages 1.23% and ranges from 0.0% to 2.0%. Arms
are therefore not perfectly matched in strictness, which we return to in the limitations.

== 3.3 Swarms, panels, and the independence baseline

A *panel* of size k is a set of k monitor arms; a submission is caught when any of the k flags it. A
*swarm* of size N makes N submissions on N distinct problems and wins when at least one goes uncaught.
Both quantities are computed exactly rather than simulated. For a backdoor flagged by $c_i$ of the M
arms, the chance a uniformly random k-subset misses it is $binom(M - c_i, k) \/ binom(M, k)$, averaged
over backdoors. For the swarm we use the elementary symmetric polynomial of the per-backdoor survival
probabilities, which gives the exact expectation over all N-subsets.

The independence baseline replaces the measured structure with the matching marginal: a panel of k
arms with mean recall $r$ is predicted to miss $(1 - r)^k$, and a swarm of N submissions with mean
evasion $q$ is predicted to win $1 - (1 - q)^N$. The ratio between measured and predicted is the
quantity of interest.

*Two confounds, both removed before the headline figure was drawn.* First, a random subset of the 43
arms frequently contains the same model twice at different efforts, which would manufacture
correlation. Every headline panel result is therefore computed on a pool of 14 arms, one per model
family. Second, exactly one arm in the project reads the author's comments while the other 42 see the
code with comments stripped. A panel mixing the two would give one member strictly more information
than the rest. The primary pool therefore uses each family's best *comment-blind* arm, so all 14
members share an information condition. We report the mixed pool and the all-43 pool alongside it, and
Section 4.6 prices the difference the comments make.

For the frontier we use the deployment framing: the defender fixes one panel and audits every
submission with it, so conditional on the panel a backdoor is either missed by all k arms or caught,
and a swarm of N is entirely caught with probability $binom(n - m, N) \/ binom(n, N)$ when the panel
misses m of the n backdoors. We average over sampled panels and report the spread across them.

= 4. Results

== 4.1 Fourteen models do not do the work of fourteen

#figure(
  image("../figures/f1-panel-scaling.png", width: 78%),
  caption: [Share of the 500 backdoors missed by every monitor in a panel of size k, log scale. The
  solid line uses one arm per model family, all in the same information condition, so no panel repeats
  a model or mixes views of the code. Independence, fitted to the same mean per-arm recall, predicts
  near-total coverage by k = 14. The measured curve flattens instead.],
) <f1>

A single monitor misses 55.6% of backdoors. Fourteen distinct models miss 8.6%. That is a real
improvement, and on a linear axis it would look like success. Against the independence prediction of
0.027% it is a factor of 315 shortfall, and the shape of the curve is the problem: the measured line
bends towards a floor while the prediction keeps falling. The penalty grows monotonically with panel
size: 1.20 times at k = 2, 2.32 at k = 4, 8.51 at k = 7, and 315 at k = 14. Pooling all 43 arms
instead gives the same shape and a slightly worse floor, so this is not an artefact of which arms we
selected.

We ran two checks a reader should want. First, the arms are not equally strict: achieved false
positive rates span 0.0% to 2.0% against the same 2% nominal target, because the score scale is
coarse. Rebuilding the panel from only the nine families whose achieved rate falls in 1.6 to 2.0%
does not weaken the effect, it sharpens it, to a 77.5-fold shortfall at k = 9. Second, our
independence baseline uses the pool's mean recall. The exact per-panel baseline, multiplying each
panel's own arm recalls, is smaller by AM-GM, so the figure we report is the conservative one: against
the per-panel baseline the shortfall at k = 14 is 4,213-fold rather than 315.

The starkest version of the result needs no ratio at all. The nine-model matched panel and the
fourteen-model panel miss *the identical 43 backdoors*. The five families added to reach fourteen
include two, haiku-4.5 and Mistral Large 4, that each catch close to half of all backdoors when
working alone. Added to the nine, they catch nothing that the nine had not already caught.

== 4.2 The attacker's lever works. The defender's does not.

#figure(
  image("../figures/f2-asymmetry.png", width: 70%),
  caption: [Measured outcome divided by the independence prediction for the same population size, log
  scale. The attacker's curve sits on 1.0 throughout. The defender's climbs past 300 times worse. Both
  sides are scaling a population; only one of them gets what the arithmetic promises.],
) <f2>

Running the identical comparison on the attacker's side gives a flat line. Across swarm sizes from 1
to 50 and against panels of 1, 3, 7 and 43 arms, the measured swarm win rate is between 1.000 and
1.017 times the independence prediction. Heterogeneity in how stealthy different backdoors are gives
the swarm a slight bonus, since a larger draw reaches further into the stealthy tail, but the effect
is under 2%.

This is the paper's central observation. The defender's scaling lever is heavily discounted and the
attacker's is not. A safety case that prices both at face value will overestimate the margin by orders
of magnitude, and it will do so in the direction that matters.

== 4.3 Why: evasion belongs to the task, not the author

#figure(
  image("../figures/f3-generators.png", width: 72%),
  caption: [Evasion rate by the model that wrote the backdoor, against one monitor and against all 43.
  Authors differ, but weakly. A one-way decomposition attributes 9.9% of the variance in per-backdoor
  evasion to generator identity and 90.1% to everything else.],
) <f3>

Generator identity does matter a little. Backdoors written by o1-mini evade a single monitor 74.9% of
the time against 35.1% for claude-3-7-sonnet-thinking, and that ordering persists against the full
panel. But a one-way decomposition attributes only 9.9% of the variance in per-backdoor evasion to the
author, and that 9.9% is an upper bound on the author's share. A cleaner two-way decomposition over the
full catch matrix separates the backdoor from the monitor: backdoor identity, the artefact, accounts for
at least 31.6% of the variance in whether an action is caught, more than the monitor accounts for
(30.2%) and far more than the author alone, with the remaining 38.1% monitor-by-backdoor interaction and
single-pass noise. The thing being judged matters at least as much as who judges it.

This explains both halves of @f2. Monitors in a panel all judge the same artefact, so they inherit its
shared variance and fail together. Swarm members hold different artefacts, so they inherit independent
draws of it and fail apart. The asymmetry is not a quirk of these models; it
follows from where the variance lives.

== 4.4 The frontier: you run out of models before you run out of attackers

#figure(
  image("../figures/f5-frontier.png", width: 72%),
  caption: [Chance that a swarm lands at least one backdoor, against panel size. Curves are swarm
  sizes. Holding a swarm of 8 below a coin flip is not achievable with any panel built from the 14
  distinct models available.],
) <f5>

#figure(
  table(
    columns: 10, align: center, stroke: 0.4pt + gray, inset: 4.5pt,
    [*Swarm N*], [1], [2], [3], [5], [8], [12], [20], [30], [50],
    [*Monitors needed*], [2], [3], [4], [8], [>14], [>14], [>14], [>14], [>14],
  ),
  caption: [Smallest panel of distinct models holding the swarm's success below 50%. The requirement
  grows faster than one monitor per swarm member and then exceeds the supply of distinct models
  entirely.],
) <t1>

The defender's cost grows faster than one distinct monitor per swarm member (@t1), and quickly stops
being payable: we have 14 distinct model families, and a swarm of 8 already defeats every panel we can
assemble from them more often than not. Duplicating models does not rescue this, which is what @f1
shows.

Two further numbers matter for anyone deploying a panel. First, *which* monitors you buy matters more
than how many at small k: a single arm misses between 49 and 500 of the 500 backdoors depending on
which arm it is, and that spread only closes above k = 11. Second, there is a hard residue. 39 of the
500 backdoors, 7.80% (95% Wilson interval 5.76 to 10.49), are missed by all 42 comment-blind arms
simultaneously. No panel assembled from those models catches them, so for that fraction monitor count
is simply the wrong dial.

== 4.5 What the public swarm corpora can and cannot support

#figure(
  image("../figures/f4-swarmtraces-templates.png", width: 70%),
  caption: [Swarm Traces payloads normalised by masking redaction placeholders, literals and numbers,
  then deduplicated. Half of all 189,579 records are 69 distinct programs; reaching 90% needs 38,550.],
) <f4>

We audited both datasets this track offers. The public Swarm Traces release holds 189,579 records
across 91,037 payloads, 75,534 recovered texts and 23,008 responses. Redaction has removed more than
the summary suggests. The `time_utc` field is null in 189,579 of 189,579 records, so the release has no
clock whatsoever. Tags are empty in 99.98% of records. Actor identity is masked, and only 28 distinct
agent identifier strings survive in the payload text, the most frequent of which is the redaction
placeholder itself, so the 7,905 agent names the investigation reports extracting are not in the public
data. The `parent_id` forest is intact but shallow: 32.2% of records have a parent, trees reach depth 2
at most, and 79.6% of trees are singletons. *Coordination analysis in the strict sense, who contacted whom and
in what order, is therefore not possible on this release*, which is worth stating plainly because the
track proposes exactly that.

What does survive is behavioural structure, and it is strikingly concentrated (@f4). Normalising
payloads and deduplicating collapses 189,579 records to 57,507 distinct programs, and 69 of them cover
half of all traffic. A population that presents as 1,200 agents is, at the level of what it actually
executes, a few dozen repeated programs with a long tail. For population-scale oversight this cuts both
ways: head coverage is cheap, and tail coverage is not.

The AI Village dataset is gated with manual review. Our main results were built before access was
granted and do not depend on it; after access was granted mid-sprint we use a sample of its real benign
agent actions, under its research-use terms and with citation, only in the domain-transfer check of
Appendix D.

== 4.6 What does work: change the monitor's information, not its headcount

One arm in the project reads the author's comments while the other 42 see the same code with comments
stripped. Holding model and reasoning effort fixed, that single difference moves recall from 93.6% to
85.0%, a drop of 8.6 points. The comparison is paired across the same 500 backdoors: 44 are caught only
when comments are visible against 1 caught only when they are not, which is a McNemar exact two-sided
p of #sym.approx 2.6 #sym.times 10#super[-12].

The panel comparison makes the point sharper. 39 backdoors survive all 42 comment-blind arms at once.
Twenty of those are caught by the single comment-reading arm. One monitor with a better view beats 42
monitors with a worse one on cases the 42 cannot touch at all, which is the practical corollary of
Section 4.3: if 90.1% of evasion variance lives in the artefact, then changing what the monitor sees of
the artefact is the lever, and changing how many monitors see the same thing is not.

We are careful about what this does and does not show. Comment stripping here is an experimental
control, not an action taken by the untrusted model, so this prices the evidentiary value of
self-incriminating natural language rather than log tampering in general. It does bound what a swarm
member gains by the simplest possible self-redaction, which is to stop confessing in comments, and it
means every other number in this paper is already measured in the harder, comment-free world.

== 4.7 Coordination is not needed, because selection substitutes for it

Our swarm so far submits on uniformly random problems, which understates a real swarm that can choose
where to attack. We priced that choice three ways against the same 14-model panel (@t2). The oracle
row is the ceiling and is uninteresting once stated: the panel misses 43 of the 500 problems outright,
so a swarm with full knowledge needs one member, not eight.

The middle row is the one that matters, because it requires no knowledge the attacker does not already
have. A swarm member can measure the size of its own edit before submitting. Ranking on that alone and
drawing from the smallest-edit quartile lifts a swarm of 8 from 51.6% to 78.1%, and a lone agent from
8.6% to 16.8%. The reason is visible in the data: the backdoors that beat the full panel have a median
edit of 13 lines against 25 for those caught, and 49% of them fall in the smallest-edit quartile, a
2.0 times enrichment.

#figure(
  table(
    columns: 8, align: center, stroke: 0.4pt + gray, inset: 4.5pt,
    [*Swarm N*], [1], [2], [3], [5], [8], [12], [20],
    [*Uncoordinated*], [8.6%], [16.5%], [23.7%], [36.3%], [51.6%], [66.4%], [84.0%],
    [*Prefers small edits*], [16.8%], [30.9%], [42.7%], [60.8%], [78.1%], [90.2%], [98.2%],
    [*Full knowledge*], [100%], [100%], [100%], [100%], [100%], [100%], [100%],
  ),
  caption: [Chance a swarm lands at least one backdoor against the 14-model comment-blind panel, by
  target selection strategy. The middle row uses only information a member holds before submitting and
  needs no messages between members.],
) <t2>

This matters for how the track frames the problem. Work on swarm oversight largely asks whether a
monitor can detect collusion or covert channels between agents. Here the attacker gains 26 points at
N = 8 without exchanging a single message, because a shared selection rule produces coordinated
behaviour out of independent agents. A detector watching the channel would see nothing, since there is
no channel. The defensive implication points at the artefact again: edit size is observable to the
defender too, so it belongs in the audit rule rather than only in the suspicion score.

== 4.8 The same floor on the audit-budget axis

Section 4.1 fixed the audit budget at a 2 percent false positive rate and varied the panel. The
complementary question is what a bigger budget buys. We swept the per-monitor audit budget from 0.5 to
20 percent, re-thresholding each arm at its own honest quantile and recomputing the fourteen-model
panel's all-miss residue exactly from the matrix at each arm's own calibrated threshold (@f6). At a 0.5
percent budget the panel misses 20.2 percent of backdoors outright, and at a 2 percent budget it misses
8.6 percent, the same 43 backdoors as the panel result in Section 4.1. Auditing forty times harder, all
the way to 20 percent of actions, only brings that to 3.6 percent (95 percent Wilson 2.29 to 5.62), and
it never reaches zero. The budget lever
has the same diminishing-returns shape as the headcount lever, and for the same reason: the backdoors
that survive are the ones every monitor ranks low together, so reviewing more of the queue keeps
resurfacing the same confident-looking code.

#figure(
  image("../figures/f6-budget-sweep.png", width: 70%),
  caption: [Backdoors caught by none of the fourteen comment-blind monitors, against the per-monitor
  audit budget, computed exactly from the matrix with a 95 percent Wilson band. A fortyfold increase in
  budget leaves a residue.],
) <f6>

== 4.9 Does being caught matter? The swarm's advantage depends on the regime

Our win condition so far is that at least one of N submissions evades, which prices catching a backdoor
at zero. In the control game a catch is consequential: it alerts the defender, who can halt the
untrusted population. That changes the direction of scale. Against the 14-model panel, which catches 457
of the 500 backdoors (91.4 percent), a swarm of 8 lands at least one backdoor 51.6 percent of the time,
but the defender also catches at least one of those 8 attempts essentially always (99.3 percent already
at a swarm of 2, and indistinguishable from certain by a swarm of 5). The quantity a deployer should
fear is neither of those: it is a swarm getting through with nothing caught at all, which falls from 8.6
percent at N = 1 toward zero as the swarm grows (0.7 percent at N = 2, under 0.1 percent by N = 3). So
the swarm's scale advantage is real only in the regime where a catch does not stop the other members,
for example simultaneous deployment or no shut-down. Where a single catch halts the population, a larger
swarm is more likely to trip the alarm, not less.

This does not rescue the panel, and it is important to say why. The 43 backdoors the panel never catches
are invisible at every swarm size, so an attacker who submits only those never trips the alarm no matter
how a catch is handled. The correlated-failure residue, not the swarm size, is what a catch-and-halt
defence still cannot cover.

= 5. Discussion and limitations

The practical reading is that monitor count is a weak lever and a capped one. Buying the second monitor
is worth a lot, the eighth is worth little, and past the supply of genuinely distinct models there is
nothing left to buy. Meanwhile the attacker's lever is undiscounted and uncapped: more agents means
proportionally more chances, exactly as the arithmetic says. Control protocols for agent populations
should therefore be evaluated against swarms rather than single agents, and safety cases that multiply
out per-monitor false negative rates should be treated as unsupported unless the correlation has been
measured for that deployment.

Section 4.6 says where the effort should go instead. Since 90.1% of evasion variance is carried by the
artefact, defences that change what the monitor sees beat defences that change how many monitors see
it, and we measured a case where one better-informed monitor outperformed 42 others on 20 backdoors
they all missed. Forcing untrusted agents to emit auditable intermediate artefacts is the generalisation
worth testing, precisely because a swarm member's cheapest counter is to stop producing such artefacts.

*Limitations.* Our headline swarm is uncoordinated by construction, so the attacker-side result in
@f2 is a lower bound. Section 4.7 bounds the other end with an oracle and measures one realistic
middle, but a swarm that shares outcomes between rounds is not modelled here and sits somewhere above
the middle row of @t2. The attacker side also assumes members draw distinct problems, so their evasion
is near-independent; a real swarm that reuses programs, and our own audit finds 69 programs cover half
the incident traffic, would correlate its draws too, discount its own scaling, and shrink the
asymmetry. Our clean attacker line is therefore the most favourable case for the attacker's scale, not
a claim that real swarms achieve it. The
setting is one domain, APPS backdoors in Python, and the correlation structure may differ elsewhere.
Monitors judge one submission in isolation, which is precisely the cross-agent view a swarm-aware
protocol would want, so our panel is a deliberately conservative stand-in for one. Achieved false
positive rates vary from 0.0% to 2.0% against the 2% nominal target because the score scale has as few
as 3 distinct honest values on some arms, so arms are not perfectly matched in strictness and the
weakest arms are near-degenerate; Section 4.1 shows the panel result survives restricting to arms
matched at 1.6 to 2.0%, and the attacker-swarm ratio stays at 1.000 at every swarm size on that same
subset, so the asymmetry is not an artefact of degenerate arms. The 10 generator labels are a fixed and somewhat dated population,
and their backdoors were credited to an author by a priority tie-break rather than at random, so
per-generator rates in @f3 should be read as indicative. We report the artefact share as a range, the
one-way 90.1% being an upper bound that folds in monitor noise and the two-way 31.6% a lower bound; both
exceed the author and the monitor main effects. The comment result in Section 4.6 rests on a
single matched pair of arms, so it establishes that information condition dominates headcount in this
case rather than how large that effect is in general. Finally, each monitor arm was run once, so
single-pass sampling noise sits inside every per-arm number.

*Future work.* Section 4.7 covers a swarm that selects without communicating. The next step is a swarm
that learns between rounds, observing which submissions survived audit and concentrating there, which
should land between our middle and oracle rows and is the version a real deployment would face. The second is to test whether a monitor that sees k submissions jointly, rather than k
monitors each seeing one, recovers the lost independence; our results predict it should, because the
correlation it has to beat is across artefacts rather than within one. The third is to replicate
Section 4.6 across model families, since one matched pair is thin ground for a lever this important.

= 6. Conclusion

We reinterpreted 21,500 existing monitor judgements as a contest between attacker swarms and monitor
panels, and found the two sides scale differently. Attacker swarms realise the independence prediction
to within 1.7%. Monitor panels fall short of theirs by a factor of 315, because whether a backdoor is
caught is mostly a property of the backdoor and only 9.9% a property of its author. A swarm of 8
defeats every panel we can build from 14 distinct models, and a swarm that merely prefers small edits
does that well at N = 5 without exchanging a message. Going from nine monitor families to fourteen
caught no additional backdoor at all. What did help was giving one monitor a better
view rather than buying more of them. For AI control under swarm conditions, adding monitors is not the
symmetric answer to adding agents.

= Code and data

- Analysis code, all intermediate CSVs and figure scripts: included with this submission. Every number
  quoted above is reproducible from `analysis/*.csv` by the scripts in `scripts/`.
- Monitor runs: pre-existing, from an ongoing control-budgets project, declared in Section 3.1.
- Swarm Traces: public release at swarmtraces.org, audited in Section 4.5.
- AI Village: gated; access granted mid-sprint, a sample of its benign agent actions is used only in
  the Appendix D transfer check, cited, under its research-use terms.

#v(0.3em)
= References

#set enum(numbering: "[1]")
+ Greenblatt, R., Shlegeris, B., Sachan, K., Roger, F. (2024). AI Control: Improving Safety Despite
  Intentional Subversion. ICML.
+ Motwani, S. et al. (2024). Secret Collusion among Generative AI Agents. NeurIPS.
+ Rose, et al. (2026). Steganographic and covert channels between language model agents.
+ METR and Redwood Research (2026). Hugging Face incident report, August 2026.
+ OpenAI (2026). The Hugging Face incident and misalignment.
+ Forman, A., Kharlov, M., Tom, W., Ladish, J., Kitts, S., Byrd, C. S., McKenzie, C., Piecha, A.
  (2026). Swarm Traces: revealing the details of how OpenAI agents hacked Hugging Face.
  https://swarmtraces.org/
+ AI Digest (2026). AI Village dataset. https://huggingface.co/datasets/aidigestorg/ai-village

#pagebreak()

= Appendix A. Limitations and dual-use / ethical considerations

*Dual use.* The headline finding is useful to an attacker: it says that running more agents is an
efficient way to defeat a monitoring panel, and that panel size has sharply diminishing returns. We
judged this publishable for three reasons. It introduces no new attack technique, no new backdoor and
no capability that did not already exist; the swarm it describes is uncoordinated, which is the weakest
possible version of the strategy and already how an unsophisticated attacker would behave; and the same
number is exactly what a defender needs in order to stop over-crediting their panel. A defender who does
not know the discount factor will build a panel of eight and believe they have a margin they do not
have. We think that failure mode is more likely and more costly than the marginal uplift this gives an
attacker. We deliberately do not publish the backdoors, the per-problem evasion table, or any ranking of which
generator writes the stealthiest code at the sample level. This is enforced in the submitted bundle
rather than merely asserted: the two sample-level matrices are withheld and `analysis/WITHHELD.md`
records why, while every aggregate needed to check a number in this paper ships with it. Section 4.6 is included because its
practical reading is defensive: it tells a deployer to invest in what the monitor can see rather than in
how many monitors there are.

*Redacted source data.* Swarm Traces is published in redacted form by its authors, who removed
credentials, personal data and infrastructure identifiers. We made no attempt to reverse any redaction,
to re-identify any actor, or to reconstruct withheld shortener or host names. Our normalisation step
deliberately masks placeholders, literals and numbers before hashing, so the analysis operates on
program structure rather than on content. We report payload *counts and structure* only. No decoded
payload is reproduced in this report.

*Gated data.* We did not attempt to bypass the AI Village access gate. The main results were built
before access existed; access was later granted through the dataset's own manual review, and we use
only a sample of its benign agent actions, under its research-use terms and with citation, in the
Appendix D transfer check. No AI Village chat text and no human or agent identities are rendered
anywhere. The benign sample was scored only through the sprint's provided inference platform, for
suspicion scoring and not for training or redistribution, and only aggregate scores are reported.

*Human subjects.* None. No personal data was collected or processed.

*Honesty of reporting.* All numbers come from the committed CSVs and are reproducible. The calibration
was validated against the source project before any result was computed. Both confounds described in
Section 3.3, repeated models and mixed information conditions, were found and removed before the
headline figure was drawn; the first draft of this analysis reported a 169-fold penalty on a panel that
mixed information conditions, and correcting it moved the headline to 315. Where a result is an upper or
lower bound we have said so in the limitations rather than in a footnote.

= Appendix B. Measured data audit

#table(
  columns: (1fr, 1.1fr, 1.1fr), align: left, stroke: 0.4pt + gray, inset: 5pt,
  [*Property*], [*Swarm Traces (public)*], [*AI Village*],
  [Access], [Open, direct download, no robots restriction set], [Gated; access granted mid-sprint; benign sample used in App. D],
  [Size], [15.2 MB gzip, 189,579 records], [Retrieved: 58 agents, 518,031 events (grew past the README)],
  [Record kinds], [payload 91,037 / recovered_text 75,534 / response 23,008], [Not retrievable],
  [Timestamps], [*0 of 189,579 records*], [*Present*: microsecond UTC on every event],
  [Actor labels], [Masked. 28 distinct agent strings survive, top one is the placeholder], [*Present*: per-event agent identity],
  [Structure], [parent_id on 32.2%, max depth 2, 79.6% of trees singleton], [Not retrievable],
  [Behavioural diversity], [57,507 normalised programs; 69 cover 50% of records], [Not retrievable],
  [Supports coordination analysis], [*No*, no clock and no actors], [Unknown],
  [Supports behavioural clustering], [Yes], [Unknown],
)

= Appendix C. LLM usage statement

LLM assistance was used for code scaffolding and for drafting prose. All analysis code was executed and
its outputs inspected; every quantitative claim in this report traces to a committed CSV produced by a
script included with the submission. The calibration step was validated by reproducing the source
project's own published recall and false-positive figures for all 43 monitor arms before any new result
was computed. No result, citation or number in this report was taken from a model's assertion.

#pagebreak()
= Appendix D. Domain-transfer check: does the calibration carry to agent actions?

A monitor's recall was measured on APPS code backdoors. Our companion visualisation treats those rates
as if they carried to agentic actions, and this appendix tests that assumption, which is the one place
the project can produce new evidence rather than replay the matrix. We scored three on-platform monitors on
a balanced set of independently sourced actions: benign actions are a sample of real AI Village agent
commands, malicious actions a sample of the public Swarm Traces incident payloads. Neither set is
self-generated. The design was pre-registered, including the metric, recall at a 2 percent benign flag
rate, and the expectation of a mismatch.

The catch rate does not transfer, and the direction is consistent across three monitors. At a 2 percent
flag rate GLM 5.3 Flash caught 75.4 percent of the malicious agent actions against 60.0 percent of APPS
backdoors, Qwen 3.8 27B caught 68.8 against 58.0 percent, and Gemma 4 26B caught 77.3 against 39.4
percent (@f7), with separation AUROC between 0.94 and 0.98. All three monitors catch the blatant real agent
actions, exfiltration and injection, more readily than the subtle code backdoors they were calibrated on.
The reading is not that oversight is easy on agents. It is that a monitor's catch rate is specific to how
subtle the action is, so a backdoor-calibrated number is a proxy, conservative for blatant actions and
with no guarantee for subtle ones. This is why the visualisation is framed as conditional on transfer
rather than as a measurement of swarm attacks.

#figure(
  image("../figures/f7-transfer.png", width: 66%),
  caption: [Recall at a 2 percent false positive rate, on APPS code backdoors versus real agent actions,
  for three on-platform monitors. Catch rate is domain-specific and does not carry across as a constant.],
) <f7>

#pagebreak()
= Appendix E. A companion simulation of control on the incident

We built a standalone interactive visualisation that projects this paper's two measured results onto a
spatial model of the July 2026 incident, in which a swarm of evaluation agents escaped a sandbox and
attacked Hugging Face. It is a communication and projection artifact, not new evidence, and we mark it
as such throughout.

The model places the swarm inside an evaluation-sandbox boundary, the real incident's target types
inside a Hugging Face boundary (secrets store, Kubernetes, dataset workers, internal chat, artifact
cache, a public image registry, a cloud account, a controller relay), and a trusted monitor at the
egress between them. Compromised agents launch attacks across the egress; the monitor audits a budget
fraction and blocks it; the misses reach a target and sometimes succeed. Two quantities are measured,
not invented: the monitor's block rate at a 2 percent budget is anchored to the domain-transfer check
of Appendix D (trusted monitors flag blatant agent actions at 69 to 77 percent at a 2 percent budget),
and a residue fraction is never blocked at any budget, which is the correlated-failure finding of the
body made spatial. The topology and the per-attack dynamics are a synthetic model; the target types and
the incident frame are from the public investigation; no critical infrastructure appears.

The artifact's one-glance message matches the paper. With no control the attacks flood through and the
targets fall; with a modest budget the monitor blocks most of the blatant attacks at the egress and few
targets fall; but a thin stream always slips through, so a residue persists at every budget. It
dramatises the practical reading of the paper: cheap, well-placed control stops the loud operational
actions that made up most of a real incident, while the quiet, correlated blind spots are what remain.
