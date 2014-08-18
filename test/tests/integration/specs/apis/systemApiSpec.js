/**
 * Network Integration
 */


describe("system.api integration", function () {
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
            client=undefined;
        }
    });

    var deletePacket = {
        dst: "system.api",
        action: "delete",
        resource: "/application/abcApplication",
        securityAttributes: {'modifyAuthority': 'apiLoader'}
    };
    var setPacket = {
        dst: "system.api",
        action: "set",
        resource: "/application/abcApplication",
        'entity' : {
            screenShots: {
                overview: {
                    url: "https://mail.example.com/screenshot1.png",
                    title: "This shows the basic user interface"
                }
            },
            links: {
                self: "names.api/application/12341-123-abba-123",
                launch: {
                    default: "https://mail.example.com",
                    development: "https://dev.mail.example.com",
                    test: "https://test.mail.example.com"
                },
                userDocs: "https://mail.example.com/help.html",
                integrationDocs: "https://mail.example.com/integration.html",
                onlineHelp: "https://mail.example.com/liveChat.html"
            },
            intents: {
            }
        },
        securityAttributes: {'modifyAuthority': 'apiLoader'}
    };
    var getPacket = {
        dst: "system.api",
        action: "get",
        resource: "/application/abcApplication"
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


    it('Client sets values', function (done) {
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

        sentSetPacket = client.send(setPacket, function (reply2) {
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
            dst: "system.api",
            action: "watch",
            resource: "/application/abcApplication"
        };

        var unwatchPacket = {
            dst: "system.api",
            action: "unwatch",
            resource: "/application/abcApplication"
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
