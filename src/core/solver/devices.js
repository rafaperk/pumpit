// Stateful devices (specification section 7). After each hydraulic convergence the solver reviews the
// device states; if any changes, the network is solved again. A link opts in by carrying a `device`
// object provided by its junction type:
//   device.initial(lk)                          → initial state
//   device.configure(lk, state)                 → sets the link mode for that state
//   device.review(lk, sol, states, next, env)   → writes the next state into `next`
(function (root) {
  const PumpIt = root.PumpIt;

  function initialStates(prep) {
    const st = {};
    for (const lk of prep.links) if (lk.device) st[lk.jid] = lk.device.initial(lk);
    return st;
  }

  function configure(prep, st) {
    for (const lk of prep.links) if (lk.device) lk.device.configure(lk, st[lk.jid]);
  }

  function review(prep, sol, st) {
    const next = Object.assign({}, st);
    for (const lk of prep.links) {
      if (!lk.device || lk.isolated) continue;
      lk.device.review(lk, sol, st, next, prep.env);
    }
    return next;
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { initialStates, configure, review });
})(typeof window !== 'undefined' ? window : globalThis);
