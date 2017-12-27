import {models} from 'jkurwa';
import gost89 from 'gost89';
import post from './post';

function query(keys) {
  const algo = gost89.compat.algos();
  const keyids = keys.map(function (priv) {
    return priv.pub().keyid(algo);
  });

  /* black magic here. blame eeeeeet */
  const ct = new Buffer(120);
  ct.fill(0);
  keyids[0].copy(ct, 0xC);
  (keyids[1] || keyids[0]).copy(ct, 0x2C);
  ct[0x6C] = 0x1;
  ct[0x70] = 0x1;
  ct[0x08] = 2;
  ct[0] = 0x0D;

  const msg = new models.Message({type: 'data', data: ct});
  return msg.as_asn1();
}

function parse(resp) {
  let rmsg;
  try {
    rmsg = new models.Message(resp);
  }
  catch (e) {
    return null
  }

  if (!rmsg.info) {
    return null;
  }
  const result = rmsg.info.readInt32LE(4);
  if (result !== 1) {
      return null;
  }
  rmsg = new models.Message(rmsg.info.slice(8));
  return rmsg.info.certificate.map((certData)=> (
    new models.Certificate(certData, true)
  ));
}

function certfetch(keys) {
  return post('https://muromec.org.ua/api/certfetch?from=masterkey.ua/services/cmp/', query(keys))
  .then(parse)
  .then((certs)=> certs || Promise.reject());
}

module.exports = certfetch;