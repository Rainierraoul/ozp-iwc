ozpIwc.NamesApiValue = ozpIwc.util.extend(ozpIwc.CommonApiValue,function(config) {
    ozpIwc.CommonApiValue.apply(this,arguments);
    config=config || {};
    this.namesApi=config.namesApi || ozpIwc.namesApi;
    this.pInfoMap={};
    this.pInfoMap.postMessageProxy=['origin','credentials','securityAttributes'];
    this.pInfoMap.multicast=['members','securityAttributes'];
    this.pInfoMap.leaderGroupMember=['electionAddress','priority','electionTimeout','leaderState','leader','leaderPriority','securityAttributes'];
});

ozpIwc.NamesApiValue.prototype.set=function(packet) {
    if(this.isValidContentType(packet.contentType)) {
        this.permissions=packet.permissions || this.permissions;
        this.contentType=packet.contentType;
        if (packet.resource==='/me' && packet.src) {
            this.resource='/address/'+packet.src;
        }
        if (this.resource) {
            if (this.resource.indexOf('/address') === 0) {
                var id = this.addressId();
                if (id) {
                    if (id === 'undefined') {
                        return;
                    }
                    this.entity = {
                        participantType: packet.entity.participantType,
                        address: packet.entity.address,
                        name: packet.entity.name
                    };
                    this.augmentParticipantInfo(packet.entity);
                    var node = this.namesApi.findOrMakeValue({resource: '/address'});
                    node.set({entity: id})
                } else {
                    this.entity=this.entity || [];
                    if (this.entity.indexOf(packet.entity) < 0) {
                        this.entity.push(packet.entity);
                    }
                }
            } else if (this.resource.indexOf('/multicast') === 0) {
                var id = this.addressId();
                this.entity=this.entity || [];
                if (id) {
                    if (id === 'undefined') {
                        return;
                    }
                    if (this.entity.indexOf(packet.entity) < 0) {
                        this.entity.push(packet.entity);
                    }
                    var node = this.namesApi.findOrMakeValue({resource: '/multicast'});
                    node.set({entity: id});
                } else {
                    if (this.entity.indexOf(packet.entity) < 0) {
                        this.entity.push(packet.entity);
                    }
                }
            }
            else {
                this.entity=packet.entity;
            }
            this.version++;
        }
    }
}

ozpIwc.NamesApiValue.prototype.deleteData=function(packet) {
    if (packet && packet.resource==='/me' && packet.src) {
        this.resource='/address/'+packet.src;
    }
    if (this.resource) {
        if (this.resource.indexOf('/address') === 0 || this.resource.indexOf('/multicast') === 0) {
            var id = this.addressId();
            if (id) {
                var originalEntity=this.entity;
                ozpIwc.CommonApiValue.prototype.deleteData.apply(this,arguments);
                if (originalEntity) {
                    var node = this.namesApi.findOrMakeValue({resource: this.resourceRoot()});
                    node.deleteData({entity: id})
                }
            } else {
                if (!this.entity) {
                    return;
                }
                var elementRemoved=false;
                this.entity=this.entity.filter(function(element) {
                    var keep=element !== packet.entity;
                    if (!keep) {
                        elementRemoved=true;
                    }
                    this.version=0;
                    return keep;
                });
                if (elementRemoved){
                    var node = this.namesApi.findOrMakeValue({resource: this.resourceRoot()+'/'+packet.entity});
                    node.deleteData();
                }
            }
        } else {
            ozpIwc.CommonApiValue.prototype.deleteData.apply(this,arguments);
        }
        this.version=0;
    }
};

ozpIwc.NamesApiValue.prototype.augmentParticipantInfo=function(participant) {
    var fields=this.pInfoMap[participant.participantType];
    var self=this;
    if (fields) {
        fields.forEach(function (field) {
            self.entity[field] = participant[field];
        });
    }
};

ozpIwc.NamesApiValue.prototype.addressId=function() {
    var regexp=/(\/address|\/multicast)\/(.*)/;
    var res=regexp.exec(this.resource);
    if (res && res.length > 2) {
        return res[2];
    }
    return null;
};

ozpIwc.NamesApiValue.prototype.resourceRoot=function() {
    var regexp=/(\/address|\/multicast)\/.*/;
    var res=regexp.exec(this.resource);
    if (res && res.length > 1) {
        return res[1];
    }
    return null;
}
