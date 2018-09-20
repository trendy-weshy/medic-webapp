const sinon = require('sinon').sandbox.create(),
      jsc = require('jsverify'),
      ids = require('../../lib/ids.js');

const mockDb = (idFilterLogicFn) => {
  return { medic: {
    view: sinon.spy((db, view, options, callback) => {
      const ids = options.keys.slice(0);
      const toReturn = {
        rows: idFilterLogicFn(ids).map(id => {return {key: id};})
      };

      callback(null, toReturn);
    }),
    get: sinon.stub().callsArgWith(1, null, {_id: 'shortcode-id-length', current_length: 5}),
    insert: sinon.stub().callsArgWith(1)
  }};
};

exports.tearDown = callback => {
  sinon.restore();

  callback();
};

exports['generates an id of the given length'] = test => {
  [5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(l =>
    test.equal(ids._generate(l).length, l));

  test.done();
};

exports['ids can start with 0, will be correct length'] = test => {
  sinon.stub(Math, 'random').returns(0.00001);

  test.equal(ids._generate(5), '00000');
  test.done();
};

exports['ids are "always" the length they should be'] = test => {
  test.ok(
    jsc.checkForall(jsc.integer(5, 13), i => ids._generate(i).length === i));
  test.done();
};

module.exports['id generator returns ids not already used in the DB'] = test => {
  let potentialIds;
  const db = mockDb((ids) => {
    potentialIds = ids;
    return [];
  });

  ids.generator(db).next().value.then(patientId => {
    test.ok(patientId, 'should return id');
    test.ok(potentialIds.some(key => key[1] === patientId), 'id should come from the cached ids');
    test.done();
  }).catch(err => test.fail(err));
};

module.exports['id generator doesnt use ids that are already used by the DB'] = test => {
  let idToUse;
  const db = mockDb(ids => {
    idToUse = ids.shift();
    return ids;
  });

  ids.generator(db).next().value.then(patientId => {
    test.equal(patientId, idToUse[1]);
    test.done();
  }).catch(err => test.fail(err));
};

module.exports['addUniqueId retries with a longer id if it only generates duplicates'] = test => {
  let potentialIds;
  const db = mockDb(ids => {
    if (ids[0][1].length === 5) {
      return ids;
    }
    potentialIds = ids;
    return [];
  });

  ids.generator(db).next().value.then(patientId => {
    test.ok(patientId, 'id should be generated');
    test.equal(patientId.length, 6);
    test.ok(potentialIds.some(key => key[1] === patientId), 'id should come from the cached ids');
    test.done();
  }).catch(err => test.fail(err));
};

module.exports['id generator uses id length from the database'] = test => {
  const db = mockDb(() => []),
        LENGTH = 10;
  db.medic.get = sinon.stub().callsArgWith(1, null, {_id: 'shortcode-id-length', current_length: LENGTH});

  ids.generator(db).next().value.then(patientId => {
    test.ok(patientId);
    test.equal(patientId.length, LENGTH);
    test.done();
  }).catch(err => test.fail(err));
};
