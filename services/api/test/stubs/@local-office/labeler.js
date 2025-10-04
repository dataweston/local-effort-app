module.exports.generateBatchLabels = async function generateBatchLabels(_batchId, labels) {
  const pdf = Buffer.from(`labels:${labels.length}`);
  const zpl = labels.map((label) => label.item).join('\n');
  return { pdf, zpl };
};
