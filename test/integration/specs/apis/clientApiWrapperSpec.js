/**
 * Network Integration
 */

describe("Client API wrapper integration", function () {
    var client;
    var participant;

    beforeEach(function(done) {
        client=new ozpIwc.Client({
            peerUrl: "http://localhost:14002"
        });
        participant=new ozpIwc.test.MockParticipant({
            clientUrl: "http://localhost:14001",
            'client': client
        });

        var gate=done_semaphore(2,done);

        participant.on("connected",gate);
        client.on("connected",gate);
    });

    afterEach(function() {
        client.disconnect();
        participant.close();
    });


    describe('Data API Actions', function () {

        afterEach(function (done) {
            var called = false;
            client.api('data.api').delete('/test')
                .then(function (packet) {
                    expect(packet.action).toEqual('ok');
                }).catch(function (error) {
                    expect(error).toBeUndefined();
                });
            if (!called) {
                called = true;
                done();
            }
        });


        it('Client sets values', function () {
            var called = false;
            client.api('data.api').set('/test', { entity: "testData"})
                .then(function (packet) {
                    if (!called) {
                        called = true;
                        expect(packet.action).toEqual('ok');
                        if (!called) {
                            called = true;
                            done();
                        }
                    }
                })
                .catch(function (error) {
                    expect(error).toBeUndefined();
                });
        });


        it('Client gets values', function (done) {
            var called = false;

            client.api('data.api').set('/test', { entity: "testData"})
                .then(function (packet) {
                    client.api('data.api').get('/test', {})
                        .then(function (packet) {
                            if (!called) {
                                called = true;

                                expect(packet.entity).toEqual('testData');

                                done();
                            }
                        })
                        .catch(function (error) {
                            expect(error).toBeUndefined();
                        })
                })
                .catch(function (error) {
                    expect(error).toBeUndefined();
                });
        });

        it('Client deletes values', function (done) {
            var called = false;
            client.api('data.api').delete('/test')
                .then(function (packet) {
                    expect(packet.action).toEqual('ok');
                    if (!called) {
                        called = true;
                        done();
                    }
                }).catch(function (error) {
                    expect(error).toBeUndefined();
                });
        });


        it('Client watches & un-watches keys', function (done) {
            var called = false;

            client.api('data.api').watch('/test', {}, function (packet) {
                if (packet.action === "changed") {
                    expect(packet.entity.newValue).toEqual('testData');
                    client.api('data.api').unwatch('/test', {})
                        .then(function (packet2) {
                            if (!called) {
                                called = true;

                                expect(packet2.action).toEqual('ok');

                                done();
                            }
                        })
                        .catch(function (error) {
                            expect(error).toBeUndefined();
                        });
                }
            })
                .catch(function(error) {
                    expect(error).toEqual(');')
                });

            client.api('data.api').set('/test', {entity: 'testData'})
                .then(function (packet) {
                    expect(packet.action).toEqual('ok');
                })
                .catch(function (error) {
                    expect(error).toBeUndefined();
                });
        });

//        xdescribe('Collection-like Actions', function () {
//
//            //TODO implement if needed
//        });
    });

    describe('Intents API Actions', function () {

        var registerEntity={
            type: "text/plain",
            action: "view",
            icon: "http://example.com/view-text-plain.png",
            label: "View Plain Text",
            invokeIntent: "system.api/application/123-412"
        }

        var setEntity={
            label: 'changed label',
            invokeIntent: 'changed invokeIntent',
            icon: 'www.changed.icon/icon.png',
            action: 'changed action',
            type: 'changed type'
        };

        it('registers handlers', function (done) {
            var called = false;

            client.api('intents.api').register('/a/b/c', {entity: registerEntity})
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

            client.api('intents.api').register('/a/b/c',{entity: registerEntity})
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

            client.api('intents.api').register('/a/b/c',{entity: registerEntity})
                .then(function(reply) {
                    client.api('intents.api').set(reply.entity,{entity: setEntity})
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

            client.api('intents.api').register('/a/b/c',{entity: registerEntity})
                .then(function(reply) {
                    client.api('intents.api').set(reply.entity,{entity: setEntity})
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

            client.api('intents.api').register('/a/b/c',{entity: registerEntity})
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

            client.api('intents.api').register('/a/b/c',{entity: registerEntity})
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

    describe("Names APi actions", function () {

        var testId="/address/testAddress";

        var testEntity = {
            entity: {name: 'testName', address: 'testAddress', participantType: 'testType'}
        };

        afterEach(function (done) {
            var called = false;

            client.api('names.api').delete(testId,testEntity)
                .then(function(reply){
                    if (!called) {
                        called = true;
                        expect(reply.action).toEqual('ok');
                        done();
                    }
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });


        it('Client sets values', function (done) {
            var called = false;
            client.api('names.api').set(testId,testEntity)
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
        });


        it('Client gets values', function (done) {
            var called = false;

            client.api('names.api').set(testId,testEntity)
                .then(function(reply) {
                    client.api('names.api').get(testId,{})
                        .then(function(reply) {
                            if (!called) {
                                called = true;
                                expect(reply.entity).toEqual(testEntity.entity);
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

        it('Client deletes values', function (done) {
            var called = false;

            client.api('names.api').delete(testId,{})
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
        });


        it('Client watches & un-watches keys', function (done) {
            var called = false;

            client.api('names.api').watch(testId,{}, function(reply) {
                if (reply.action === 'changed') {
                    expect(reply.entity.newValue).toEqual(testEntity.entity);
                    client.api('names.api').unwatch(testId)
                        .then(function(reply) {
                            expect(reply.action).toEqual('ok');
                            if (!called) {
                                called=true;
                                done();
                            }
                        })
                        .catch(function(error) {
                            expect(error).toEqual('');
                        });
                    return true;
                }
            })
                .then(function(reply) {
                    if (reply.action === 'ok') {
                        client.api('names.api').set(testId, testEntity)
                            .then(function (reply) {
                                expect(reply.action).toEqual('ok');
                            })
                            .catch(function (error) {
                                expect(error).toEqual('');
                            });
                    }
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });
    });

    describe("System API Actions", function () {
        var testResource="/application/abcApplication";

        var securityAttributes={'modifyAuthority': 'apiLoader'};

        var testEntity={
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
        };

        afterEach(function (done) {
            var called = false;
            client.api('system.api').delete(testResource, {'securityAttributes': securityAttributes})
                .then(function(reply) {
                    if (!called) {
                        expect(reply.action).toEqual('ok');
                        called = true;
                        done();
                    }
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });


        it('Client sets values', function (done) {
            var called = false;
            client.api('system.api').set(testResource,{entity: testEntity,'securityAttributes': securityAttributes})
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
        });


        it('Client gets values', function (done) {
            var called = false;
            client.api('system.api').set(testResource,{entity: testEntity, 'securityAttributes': securityAttributes})
                .then(function(reply) {
                    client.api('system.api').get(testResource)
                        .then(function(reply) {
                            if (!called) {
                                called = true;
                                expect(reply.action).toEqual('ok');
                                expect(reply.entity).toEqual(testEntity);
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

        it('Client deletes values', function (done) {
            var called = false;
            client.api('system.api').delete(testResource,{'securityAttributes': securityAttributes})
                .then(function(reply) {
                    if (!called) {
                        expect(reply.action).toEqual('ok');
                        called = true;
                        done();
                    }
                })
                .catch(function(error) {
                    expect(error).toEqual('');
                });
        });


        it('Client watches & un-watches keys', function (done) {
            var called = false;

            client.api('system.api').watch(testResource,{entity: testEntity},function(reply) {
                if (reply.action === 'changed') {
                    expect(reply.entity.newValue).toEqual(testEntity);
                    client.api('system.api').unwatch(testResource)
                        .then(function (reply) {
                            if (!called) {
                                expect(reply.action).toEqual('ok');
                                called=true;
                                done();
                            }
                        })
                        .catch(function (error) {
                            expect(error).toEqual('');
                        });
                    return true;
                }
            })
                .then(function(reply) {
                    client.api('system.api').set(testResource,{entity: testEntity,'securityAttributes': securityAttributes})
                        .then(function(reply) {
                            expect(reply.action).toEqual('ok');
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