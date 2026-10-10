const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildEventConfirmations, queueEventConfirmations } = require('../backend/api/services/saleConfirmations');
const { createEmailOutboxService } = require('../backend/api/services/emailOutbox');
const estimate = { id: 'fixture', location: 'firehouse', contactName: '<script>bad</script>', contactEmail: 'owner@example.com', eventDate: '2026-11-14', eventTime: '18:30', guestCount: 16 };
function fixture() {
  const docs = new Map();
  let sends = 0;
  let fail = false;
  const sc = {
    getDocument: async id => docs.get(id),
    createIfNotExists: async doc => { if (!docs.has(doc._id)) docs.set(doc._id, { ...doc, _rev: '1' }); },
    fetch: async (q, p) => {
      if (q.includes('emailSubscriber')) return [{ email: estimate.contactEmail, status: 'unsubscribed' }];
      return [...docs.values()]
        .filter(d => (!p.ids.length || p.ids.includes(d._id))
          && (p.anySource || d.source === p.source)
          && ['queued', 'retry'].includes(d.status))
        .map(d => ({ ...d }));
    },
    patch(id) {
      let values = {}, removals = [], revision;
      return {
        ifRevisionId(r) { revision = r; return this; },
        set(v) { Object.assign(values, v); return this; },
        unset(v) { removals.push(...v); return this; },
        async commit() {
          const d = docs.get(id);
          if (revision && revision !== d._rev) throw Error('conflict');
          Object.assign(d, values, { _rev: String(Number(d._rev) + 1) });
          removals.forEach(k => delete d[k]);
          return d;
        },
      };
    },
  };
  const service = createEmailOutboxService({
    getSanityClient: () => sc,
    brevoService: {
      async sendEmail(p) {
        if (fail) throw Error('temporary');
        sends++;
        assert.ok(p.headers['Idempotency-Key']);
        return { json: async () => ({ messageId: `message-${sends}` }) };
      },
    },
  });
  return { service, docs, sends: () => sends, fail: value => { fail = value; } };
}
test('customer receipt contains accurate details, photograph, contact and links; escapes input',()=>{
  const [customer, owner]=buildEventConfirmations({estimate,amountCents:35800});
  assert.match(customer.payload.htmlContent,/hall.webp/);assert.match(customer.payload.textContent,/6:30 PM Central/);assert.match(customer.payload.textContent,/1290 Snelling Ave N/);assert.match(customer.payload.textContent,/Saturday, November 14, 2026/);assert.match(customer.payload.textContent,/\$358.00/);assert.match(customer.payload.htmlContent,/mailto:yum@localeffortfood.com/);assert.match(customer.payload.htmlContent,/instagram.com\/localeffort/);assert.doesNotMatch(customer.payload.htmlContent,/<script>/);assert.equal(owner.payload.to[0].email,'yum@localeffortfood.com');
});
test('missing time is honest; missing buyer email prevents incomplete confirmation',()=>{
  assert.match(buildEventConfirmations({estimate:{...estimate,eventTime:null},amountCents:1})[0].payload.textContent,/Time: To be confirmed with you/);
  assert.throws(()=>buildEventConfirmations({estimate:{...estimate,contactEmail:null}}),/email-required/);
});
test('webhook replay sends each role once and marketing opt-out retains transactional receipt',async()=>{
  const f=fixture();const args={estimate,amountCents:35800,emailOutboxService:f.service};await queueEventConfirmations(args);await queueEventConfirmations(args);assert.equal(f.sends(),2);assert.equal(f.docs.size,2);assert.ok([...f.docs.values()].every(d=>d.status==='sent' && d.providerMessageId));
});
test('concurrent outbox workers claim each confirmation only once', async () => {
  const f = fixture();
  for (const { role, payload } of buildEventConfirmations({ estimate, amountCents: 35800 })) {
    await f.service.enqueue({
      payload,
      idempotencyKey: `event-confirmation:${estimate.id}:${role}:v1`,
      category: 'transactional',
      source: 'sale-confirmation',
    });
  }

  const results = await Promise.all([
    f.service.processBatch({ source: 'sale-confirmation' }),
    f.service.processBatch({ source: 'sale-confirmation' }),
  ]);

  assert.equal(results.reduce((total, result) => total + result.sent, 0), 2);
  assert.equal(f.sends(), 2);
  assert.ok([...f.docs.values()].every(doc => doc.status === 'sent'));
});
test('provider failure persists retry jobs, then recovers without losing either recipient',async()=>{
  const f=fixture();f.fail(true);await queueEventConfirmations({estimate,amountCents:35800,emailOutboxService:f.service});assert.ok([...f.docs.values()].every(d=>d.status==='retry'));f.fail(false);await f.service.processBatch({source:'sale-confirmation'});assert.equal(f.sends(),2);
});
test('failed second enqueue propagates and replay does not duplicate the first job',async()=>{
  const f=fixture();let calls=0;const outbox={...f.service,enqueue:async a=>{if(++calls===2)throw Error('unavailable');return f.service.enqueue(a);}};
  await assert.rejects(queueEventConfirmations({estimate,amountCents:1,emailOutboxService:outbox}));await queueEventConfirmations({estimate,amountCents:1,emailOutboxService:f.service});assert.equal(f.sends(),2);assert.equal(f.docs.size,2);
});
test('payment handler ignores failed payments; verified payment queues emails and queue failure reaches webhook',async()=>{
  let queued=0,paid=0,fail=false;const prisma={smallEventPayment:{findFirst:async()=>({estimateId:estimate.id}),upsert:async()=>{paid++;}},smallEventEstimate:{update:async()=>estimate,findUnique:async()=>null},smallEventHold:{updateMany:async()=>{}}};
  const sandbox={module:{exports:{}},require:p=>p==='./prisma'?{prisma}:p.includes('saleConfirmations')?{queueEventConfirmations:async()=>{if(fail)throw Error('queue-down');queued++;}}:p.includes('receivables')?{fifoOrder:x=>x}:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../backend/api/utils/smallEventsPayments'),'utf8'),sandbox);
  const apply=sandbox.module.exports.applySmallEventPayment;assert.equal(await apply({id:'p',status:'FAILED'}),false);assert.equal(paid,0);await apply({id:'p',status:'COMPLETED',order_id:'o'});assert.equal(queued,1);fail=true;await assert.rejects(apply({id:'p',status:'COMPLETED',order_id:'o'}),/queue-down/);
});
