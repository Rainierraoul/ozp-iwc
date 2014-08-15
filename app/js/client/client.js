var ozpIwc=ozpIwc || {};

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
    var self=this;

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
    this.messageEventListener=window.addEventListener("message", this.postMessageHandler, false);
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
ozpIwc.Client.prototype.send=function(fields,callback) {
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
    if(event==="connected" && this.address !=="$nobody") {
        callback(this);
        return;
    }
    return this.events.on.apply(this.events,arguments);
};

ozpIwc.Client.prototype.off=function(event,callback) {
    return this.events.off.apply(this.events,arguments);
};

ozpIwc.Client.prototype.disconnect=function() {
    window.removeEventListener("message",this.messageEventListener,false);
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
            wrapper.api=ozpIwc.namesApi;
        case 'system.api':
            wrapper.api=ozpIwc.systemApi;
            break;
        case 'intents.api':
            wrapper =augment(wrapper,['register','unregister','invoke','listen','broadcast'],invokeApi);
            wrapper.api=ozpIwc.intentsApi;
            break;
        case 'data.api':
            wrapper=augment(wrapper,['list','push','pop','unshift','shift'],invokeApi);
            wrapper.api=ozpIwc.dataApi;
            break;
        default:
            wrapper.error='Invalid API';
    }
    return wrapper;
}

var makeCommonWrapper=function() {
    return augment({},['get','set','delete','watch','unwatch'],invokeApi)
}

var augment=function(obj,methods,callback) {
    for (var m in methods) {
        obj[m]=function() {
            callback(this,m,arguments);
        }
    }
}

var invokeApi=function(self,action,resource,packet,callback) {
    var resolveCB=function(){};
    var rejectCB=function(){};
    var p=new Promise(function(resolve,reject) {
        resolveCB=resolve;
        rejectCB=reject;
    });
    if (self.error) {
        rejectCB(self.error);
    } else {
        var value=self.api.findOrMakeValue(packet);
        var method="handle" + action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
        //self.api[method](...);
    }
    return p;
}