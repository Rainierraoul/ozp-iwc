/**
 * Network Integration
 */


describe("names.api integration", function () {
    var client;

    beforeEach(function (done) {
        // current version of jasmine breaks if done() is called multiple times
        // use the called flag to prevent this
        var called = false;
        var clientGen = {
            clientUrl: "http://localhost:14000/integration/additionalOrigin.html"
        };

        generateClient(clientGen, function (clientRef) {
            if (!called) {
                called = true;
                client = clientRef;
                done();
            }
        });
    });

    afterEach(function () {
        if (client) {
            client.remove();
        }
    });

    var deletePacket = {
        dst: "names.api",
        action: "delete",
        resource: "/address/testAddress"
    };
    var setPacket = {
        dst: "names.api",
        action: "set",
        resource: "/address/testAddress",
        entity: {name: 'testName', address: 'testAddress', participantType: 'testType'}
    };
    var getPacket = {
        dst: "names.api",
        action: "get",
        resource: "/address/testAddress"
    };

    beforeEach(function () {

    });

    afterEach(function (done) {
        var called = false;
        client.send(deletePacket, function (reply) {
            if (!called) {
                called = true;

                done();
                // return falsy to stop callback persistance.
                return null;
            }
        });
    });


    it('Client sets values', function () {
        var called = false;
        var sentPacket;

        var setCallback = function (reply) {
            if (!called) {
                called = true;

                expect(reply.replyTo).toEqual(sentPacket.msgId);
                expect(reply.action).toEqual('ok');

                done();
                return null;
            }
        };

        sentPacket = client.send(setPacket, setCallback);
    });


    it('Client gets values', function (done) {
        var called = false;
        var sentSetPacket, sentGetPacket;

        var getCallback = function (reply) {
            if (!called) {
                called = true;

                expect(reply.replyTo).toEqual(sentGetPacket.msgId);
                expect(reply.entity).toEqual(sentSetPacket.entity);

                done();
                return null;
            }
        };

        sentSetPacket = client.send(setPacket, function (reply) {
            sentGetPacket = client.send(getPacket, getCallback);
        });
    });

    it('Client deletes values', function (done) {
        var called = false;
        var sentDeletePacket;
        var deleteCallback = function (reply) {
            if (!called) {
                called = true;

                expect(reply.replyTo).toEqual(sentDeletePacket.msgId);
                expect(reply.action).toEqual('ok');

                done();
                return null;
            }
        };

        sentDeletePacket = client.send(deletePacket, deleteCallback);
    });


    it('Client watches & un-watches keys', function (done) {
        var called = false;
        var sentWatchPacket, sentUnwatchPacket, sentSetPacket;

        var watchPacket = {
            dst: "names.api",
            action: "watch",
            resource: "/address/testAddress"
        };

        var unwatchPacket = {
            dst: "names.api",
            action: "unwatch",
            resource: "/address/testAddress"
        };

        var unwatchCallback = function (reply) {
            if (!called) {
                called = true;

                expect(reply.replyTo).toEqual(sentUnwatchPacket.msgId);
                expect(reply.action).toEqual('ok');

                done();
                return null;
            }
        };

        var watchCallback = function (reply) {
            if (reply.action === "changed") {
                expect(reply.replyTo).toEqual(sentWatchPacket.msgId);
                expect(reply.entity.newValue).toEqual(sentSetPacket.entity);

                sentUnwatchPacket = client.send(unwatchPacket, unwatchCallback);
                return null;
            }
            // return truthy to persist callback
            return true;
        };

        sentWatchPacket = client.send(watchPacket, watchCallback);
        sentSetPacket = client.send(setPacket);
    });
});
