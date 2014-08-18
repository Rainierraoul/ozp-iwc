/**
 * Network Integration
 */

describe("client api wrapper integration", function () {
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


    describe('Data API Common Actions', function () {

        var getFragment = {
            resource: "/test"
        };

        beforeEach(function () {

        });

        afterEach(function (done) {
            var called = false;
            client.api('data.api').delete('/test',{})
                .then(function(packet) {
                    expect(packet.action).toEqual('ok');
                }).catch(function(error) {
                    expect(error).toBeUndefined();
                });
            if (!called) {
                called = true;
                done();
            }
        });


        it('Client sets values', function () {
            var called = false;
            client.api('data.api').set('/test',{ entity: "testData"})
                .then(function(packet) {
                    if (!called) {
                        called = true;
                        expect(packet.action).toEqual('ok');
                        if (!called) {
                            called = true;
                            done();
                        }
                    }
                })
                .catch(function(error) {
                    expect(error).toBeUndefined();
                });
        });


        it('Client gets values', function (done) {
            var called = false;

            client.api('data.api').set('/test',{ entity: "testData"})
                .then(function(packet) {
                    client.api('data.api').get('/test',{})
                        .then(function(packet) {
                            if (!called) {
                                called = true;

                                expect(packet.entity).toEqual('testData');

                                done();
                            }
                        })
                        .catch(function(error) {
                            expect(error).toBeUndefined();
                        })
                })
                .catch(function(error) {
                    expect(error).toBeUndefined();
                });
        });
    });

    it('Client deletes values', function (done) {
        var called = false;
        client.api('data.api').delete('/test',{})
            .then(function(packet) {
                expect(packet.action).toEqual('ok');
                if (!called) {
                    called = true;
                    done();
                }
            }).catch(function(error) {
                expect(error).toBeUndefined();
            });
    });


    it('Client watches & un-watches keys', function (done) {
        var called = false;

        client.api('data.api').watch('/test',{},function(packet) {
            if (packet.action === "changed") {
                expect(packet.entity.newValue).toEqual('testData');
                client.api('data.api').unwatch('/test',{})
                    .then(function(packet2) {
                        if (!called) {
                            called = true;

                            expect(packet2.action).toEqual('ok');

                            done();
                        }
                    })
                    .catch(function(error) {
                        expect(error).toBeUndefined();
                    });
            }
        });

        client.api('data.api').set('/test',{entity: 'testData'})
            .then(function(packet) {
                expect(packet.action).toEqual('ok');
            })
            .catch(function(error) {
                expect(error).toBeUndefined();
            });
    });

    xdescribe('Collection-like Actions', function () {

        var deletePacket = {
            dst: "data.api",
            action: "delete",
            resource: "/test"
        };
        var listPacket = {
            dst: "data.api",
            action: "list",
            resource: "/test"
        };

        var pushPacket = {
            dst: "data.api",
            action: "push",
            resource: "/test",
            entity: 'testData'
        };

        beforeEach(function () {

        });

        afterEach(function (done) {
            var called = false;
            client.send(deletePacket, function (reply) {
                if (!called) {
                    called = true;

                    done();
                    return null;
                }
            });
        });


        it('Client pushes values', function (done) {
            var called = false;
            var sentPushPacket;

            var pushCallback = function (reply) {
                if (!called) {
                    called = true;

                    expect(reply.replyTo).toEqual(sentPushPacket.msgId);
                    expect(reply.action).toEqual('ok');

                    done();
                    return null;
                }
            };

            sentPushPacket = client.send(pushPacket, pushCallback);
        });


        it('Client pops values', function (done) {
            var called = false;
            var sentPopPacket, sentPushPacket;

            var pushPacket = {
                dst: "data.api",
                action: "push",
                resource: "/test",
                entity: 'testData'
            };
            var popPacket = {
                dst: "data.api",
                action: "pop",
                resource: "/test"
            };

            var popCallback = function (reply) {
                if (!called) {
                    called = true;

                    expect(reply.replyTo).toEqual(sentPopPacket.msgId);
                    expect(reply.action).toEqual('ok');
                    expect(reply.entity).toEqual(sentPushPacket.entity);

                    done();
                    return null;
                }
            };

            var pushCallback = function (reply) {
                sentPopPacket = client.send(popPacket, popCallback);
            };

            sentPushPacket = client.send(pushPacket, pushCallback);

        });


        it('Client lists values', function (done) {
            var called = false;
            var sentListPacket;

            var listCallback = function (reply) {
                if (!called) {
                    called = true;

                    expect(reply.replyTo).toEqual(sentListPacket.msgId);
                    expect(reply.action).toEqual('ok');

                    done();
                    return null;
                }
            };

            sentListPacket = client.send(listPacket, listCallback);
        });


        it('Client unshifts values', function () {
            var called = false;
            var sentUnshiftPacket;

            var unshiftPacket = {
                dst: "data.api",
                action: "unshift",
                resource: "/test"
            };

            var unshiftCallback = function (reply) {
                if (!called) {
                    called = true;

                    expect(reply.replyTo).toEqual(sentUnshiftPacket.msgId);
                    expect(reply.action).toEqual('ok');

                    done();
                    return null;
                }
            };

            sentUnshiftPacket = client.send(unshiftPacket, unshiftCallback);
        });


        it('shifts values', function () {
            var called = false;
            var sentShiftPacket;

            var shiftPacket = {
                dst: "data.api",
                action: "shift",
                resource: "/test"

            };

            var shiftCallback = function (reply) {
                if (!called) {
                    called = true;

                    expect(reply.replyTo).toEqual(sentShiftPacket.msgId);
                    expect(reply.action).toEqual('ok');

                    done();
                    return null;
                }
            };

            sentShiftPacket = client.send(shiftPacket, shiftCallback);
        });
    });
    describe('Intents API Common Actions', function () {

        var registerEntity = function() {
            return {
                entity: {
                    type: "text/plain",
                    action: "view",
                    icon: "http://example.com/view-text-plain.png",
                    label: "View Plain Text",
                    invokeIntent: "system.api/application/123-412"
                }
            };
        }

        var setEntity = function() {
            return {
                entity: {
                    label: 'changed label',
                    invokeIntent: 'changed invokeIntent',
                    icon: 'www.changed.icon/icon.png',
                    action: 'changed action',
                    type: 'changed type'
                }
            }
        };

        it('registers handlers', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c', registerEntity())
                .then(function (reply) {
                    if (!called) {
                        called = true;

                        expect(reply.action).toEqual('ok');
                        expect(reply.entity).toContain('/a/b/c');
                        done();
                    }
                })
                .catch(function (error) {
                    expect(error).toEqual('');
                });
        });

        it('unregisters handlers', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c',registerEntity())
                .then(function(reply) {
                    client.api('intents.api').unregister('/a/b/c',reply.entity)
                        .then(function(reply) {
                            if (!called) {
                                called = true;

                                expect(reply.action).toEqual('ok');
                                done();
                            }
                        })
                        .catch(function(error) {
                            expect(error).toEqual('');
                        });
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });

        });

        it('sets handler properties', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c',registerEntity())
                .then(function(reply) {
                    client.api('intents.api').set(reply.entity,setEntity())
                        .then(function(reply) {
                            if (!called) {
                                called = true;
                                expect(reply.action).toEqual('ok');
                                done();
                            }
                        })
                        .catch(function(error) {
                            expect(error).toEqual('');
                        });
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });

        it('gets handler properties', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c',registerEntity())
                .then(function(reply) {
                    client.api('intents.api').set(reply.entity,setEntity())
                        .then(function(reply) {
                            client.api('intents.api').get('/a/b/c',reply.entity)
                                .then(function(reply) {
                                    if (!called) {
                                        called = true;
                                        label: 'changed label',
                                            expect(reply.entity).toEqual(reply.entity);
                                        done();
                                    }
                                })
                                .catch(function(error) {
                                    expect(error).toEqual('');
                                });
                        })
                        .catch(function(error) {
                            expect(error).toEqual('');
                        });
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });

        it('deletes handlers', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c',registerEntity)
                .then(function(reply) {
                    client.api('intents.api').delete('/a/b/c',reply.entity)
                        .then(function(reply) {
                            if (!called) {
                                expect(reply.action).toEqual('ok');
                                done();
                            }
                        })
                        .catch(function(error) {
                            expect(error).toEqual('');
                        });
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });

        xit('Invokes specific handlers', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c',registerEntity())
                .then(function(reply) {
                    client.api('intents.api').invoke(reply.entity,{})
                        .then(function(reply) {
                            if (!called) {
                                expect(reply.action).toEqual('ok');
                                done();
                            }
                        })
                        .catch(function(error) {
                            expect(error).toEqual('');
                        });
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });

    });
});