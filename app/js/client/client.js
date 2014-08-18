var ozpIwc=ozpIwc || {};

var self;

//TODO get these from the api registry when available
var intents_methods=['register','unregister','invoke','listen','broadcast'];

var data_methods=['list','push','pop','unshift','shift'];

/**
 * @class
 * This class will be heavily modified in the future.
 *
 * @todo accept a list of peer URLs that are searched in order of preference
 * @param {object} config
 * @param {string} config.peerUrl - Base URL of the peer server
 * @param {boolean} [config.autoPeer=true] - Whether to automatically find and connect to a peer
 */
ozpIwc.Client=function(config) {
	config=config || {};
	this.address="$nobody";
	this.replyCallbacks={};
	this.peerUrl=config.peerUrl;
	var a=document.createElement("a");
	a.href = this.peerUrl;
	this.peerOrigin=a.protocol + "//" + a.hostname;
	if(a.port)
		this.peerOrigin+= ":" + a.port;
	
	
	this.autoPeer=("autoPeer" in config) ? config.autoPeer : true;
	this.msgIdSequence=0;
	this.events=new ozpIwc.Event();
	this.events.mixinOnOff(this);
	this.receivedPackets=0;
	this.receivedBytes=0;
	this.sentPackets=0;
	this.sentBytes=0;
	this.startTime=ozpIwc.util.now();
    this.window = window;
	self=this;

	if(this.autoPeer) {
		this.findPeer();
	}

    this.postMessageHandler = function(event) {
        if(event.origin !== self.peerOrigin){
            return;
        }
        try {
            var message=event.data;
            if (typeof(message) === 'string') {
                message=JSON.parse(event.data);
            }
            self.receive(message);
            self.receivedBytes+=(event.data.length * 2);
            self.receivedPackets++;
        } catch(e) {
            // ignore!
        }
    };
	// receive postmessage events
	window.addEventListener("message", this.postMessageHandler, false);
    
    this.preconnectionQueue=[];
    
    this.on("connected",function() {
        self.preconnectionQueue.forEach(function(p) {
            console.log("Sending from queue: ",p);
            self.send(p.fields,p.callback,p.promise);
        });
        self.preconnectionQueue=null;
    });
};

/**
 * Receive a packet from the connected peer.  If the packet is a reply, then
 * the callback for that reply is invoked.  Otherwise, it fires a receive event
 * @fires ozpIwc.Client#receive
 * @protected
 * @param {ozpIwc.TransportPacket} packet
 * @returns {undefined}
 */
ozpIwc.Client.prototype.receive=function(packet) {
    if(packet.replyTo && this.replyCallbacks[packet.replyTo]) {
        if (!this.replyCallbacks[packet.replyTo](packet)) {
            this.cancelCallback(packet.replyTo);
        }
    } else {
        this.events.trigger("receive",packet);
    }
};
/**
 * Used to send a packet
 * @param {string} dst - where to send the packet
 * @param {object} entity - payload of the packet
 * @param {function} callback - callback for any replies. The callback will be
 * persisted if it returns a truth-like value, canceled if it returns a
 * false-like value.
 */
ozpIwc.Client.prototype.send=function(fields,callback,preexistingPromise) {
    var promise= preexistingPromise; // || new Promise();
    if(!(this.isConnected() || fields.dst=="$transport")) {
        // when send is switched to promises, create the promise first and return it here, as well
        console.log("Queuing to be sent later:",arguments);
        this.preconnectionQueue.push({
            'fields': fields,
            'callback': callback,
            'promise': promise
        });
        return promise;
    }
    var now=new Date().getTime();
	var id="p:"+this.msgIdSequence++; // makes the code below read better
	var packet={
		ver: 1,
		src: this.address,
		msgId: id,
		time: now
	};

	for(var k in fields) {
		packet[k]=fields[k];
	}

	if(callback) {
		this.replyCallbacks[id]=callback;
	}
	var data=packet;
    if (!ozpIwc.util.structuredCloneSupport()) {
        data=JSON.stringify(packet);
    }
	this.peer.postMessage(data,'*');
	this.sentBytes+=data.length;
	this.sentPackets++;
	return packet;
};
ozpIwc.Client.prototype.isConnected=function(){
	return this.address !== "$nobody";
};
/**
 * Cancel a callback registration
 * @param (string} msgId - The packet replyTo ID for which the callback was registered
 */
ozpIwc.Client.prototype.cancelCallback=function(msgId) {
    var success=false;
    if (msgId) {
        delete this.replyCallbacks[msgId];
        success=true;
    }
    return success;
};


ozpIwc.Client.prototype.on=function(event,callback) {
	if(event==="connected" && this.isConnected()) {
		callback(this);
		return;
	}
	return this.events.on.apply(this.events,arguments);
};

ozpIwc.Client.prototype.off=function(event,callback) {
    return this.events.off.apply(this.events,arguments);
};

ozpIwc.Client.prototype.disconnect=function() {
    this.replyCallbacks={};
    window.removeEventListener("message",this.postMessageHandler,false);
    if(this.iframe) {
        document.body.removeChild(this.iframe);
    }
};

ozpIwc.Client.prototype.createIframePeer=function(peerUrl) {
    var self=this;
    var createIframeShim=function() {
        self.iframe=document.createElement("iframe");
        self.iframe.src=peerUrl+"/iframe_peer.html";
        self.iframe.height=1;
        self.iframe.width=1;
        self.iframe.style.setProperty ("display", "none", "important")
        self.iframe.addEventListener("load",function() { self.requestAddress(); },false);
        document.body.appendChild(self.iframe);
        self.peer=self.iframe.contentWindow;

    };
    // need at least the body tag to be loaded, so wait until it's loaded
    if(document.readyState === 'complete' ) {
        createIframeShim();
    } else {
        window.addEventListener("load",createIframeShim,false);
    }
};

ozpIwc.Client.prototype.findPeer=function() {
    // check if we have a parent, get address there if so
//	if(window.parent!==window) {
//		this.peer=window.parent;
//		this.requestAddress();
//	} else {
    this.createIframePeer(this.peerUrl);
//	}
};

ozpIwc.Client.prototype.requestAddress=function(){
	// send connect to get our address
	var self=this;
	this.send({dst:"$transport"},function(message) {
		self.address=message.dst;
		self.events.trigger("connected",self);
        return null;//de-register callback
	});
};

ozpIwc.Client.prototype.api=function(apiName) {
    var wrapper=makeCommonWrapper();
    switch(apiName) {
        case 'names.api':
        case 'system.api':
            break;
        case 'intents.api':
            wrapper =augment(wrapper,intents_methods,invokeApi);
            break;
        case 'data.api':
            wrapper=augment(wrapper,data_methods,invokeApi);
            break;
        default:
            wrapper.error='Invalid API';
    }
    wrapper.apiName=apiName;
    return wrapper;
}

var makeCommonWrapper=function() {
    return augment({},['get','set','delete','watch','unwatch'],invokeApi)
}

var augment=function(obj,methods,callback) {
    for (var m in methods) {
        addMethod(obj,methods[m],callback);
    }
    return obj;
}

var addMethod=function(obj,method,callback) {
    obj[method] = function(resource, fragment, cb) {
        return callback.call(obj,method,resource, fragment, cb);
    };
}

var invokeApi=function(action,resource,fragment,callback) {
    fragment=fragment || {};
    fragment.entity=fragment.entity || {};
    resource=resource || '';
    var resolveCB=function(){};
    var rejectCB=function(){};
    var p=new Promise(function(resolve,reject) {
        resolveCB=resolve;
        rejectCB=reject;
    });
    var that=this;
    if (that.error) {
        rejectCB(that.error);
    } else {
        var packet={
            'dst': that.apiName,
            'action': action,
            'resource': resource

        };
        for(var k in fragment) {
            packet[k]=fragment[k];
        }
        var resolved=false;
        try {
            self.send(packet, function (response) {
                if (response.action === 'ok' && !resolved) {
                    resolveCB(response);
                    resolved=true;
                } else if (/(bad|no).*/.test(response.action) && !resolved) {
                    rejectCB(response.action);
                    resolved=true;
                }
                if (callback && !(/(bad|no).*/.test(response.action))) {
                    callback(response);
                    return true;//persist
                }
                return false;
            });
        }  catch (error) {
            //Would be nice to check that the promise is not already resolved, since we don't know
            //where the exception will occur, but there is no isResolved() or equivalent method
            rejectCB(error);
        }
    }
    return p;
}