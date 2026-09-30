/**
 * The arithmetic, including the cases where a plan term changes the answer.
 *
 * These are the tests that matter: an estimator that is right on the easy path and wrong when the
 * annual maximum runs out is wrong when it counts.
 */
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { annualMaximumUsage, compareNetworks, estimateProcedure } from '../src/estimate.js'
import { matchProcedure } from '../src/costs.js'

const PLAN = {
  annualMaximumCents: 150000,
  annualMaximumUsedCents: 0,
  deductibleCents: 5000,
  deductibleMetCents: 0,
  coinsurance: { preventive: 1, basic: 0.8, major: 0.5, orthodontia: 0.5 },
  network: 'IN_NETWORK',
  waitingPeriodsMonths: { preventive: 0, basic: 0, major: 12, orthodontia: 12 },
  frequencyLimitsPerYear: { D1110: 2 },
  frequencyUsedPerYear: {},
  monthsEnrolled: 24,
  fsaBalanceCents: 0,
}

test('preventive care skips the deductible and is paid in full', () => {
  const e = estimateProcedure(PLAN, 'D1110')
  assert.equal(e.deductibleAppliedCents, 0)
  assert.equal(e.planPaysCents, 9800)
  assert.equal(e.employeeOwesCents, 0)
})

test('the deductible is taken once, before coinsurance', () => {
  const e = estimateProcedure(PLAN, 'D2391')
  assert.equal(e.deductibleAppliedCents, 5000)
  // (18700 - 5000) * 0.8 = 10960
  assert.equal(e.planPaysCents, 10960)
  assert.equal(e.employeeOwesCents, 18700 - 10960)
})

test('out of network costs the employee more, from the same reference data', () => {
  const c = compareNetworks(PLAN, 'D2740')
  assert.ok(c.outOfNetwork.employeeOwesCents > c.inNetwork.employeeOwesCents)
  assert.equal(c.differenceCents, c.outOfNetwork.employeeOwesCents - c.inNetwork.employeeOwesCents)
})

test('the annual maximum is tracked as a running balance across planned care', () => {
  const estimates = ['D1110', 'D2391', 'D2740'].map((c) => estimateProcedure(PLAN, c))
  const usage = annualMaximumUsage(PLAN, estimates)
  assert.equal(usage.timeline.length, 3)
  assert.ok(usage.timeline[2].remainingAfterCents < usage.timeline[0].remainingAfterCents)
  assert.equal(usage.remainingCents, 150000)
})

test('free text finds the procedure, and an unmatched description says what to do', () => {
  assert.equal(matchProcedure('I need a crown on a back tooth').code, 'D2740')
  assert.equal(matchProcedure('D3310').code, 'D3310')
  const miss = matchProcedure('something unrelated entirely')
  assert.equal(miss.matched, false)
  assert.match(miss.reason, /CDT code/)
})
