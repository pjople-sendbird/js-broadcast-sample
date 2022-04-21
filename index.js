var APP_ID;
var USER_ID;
var ACCESS_TOKEN;
var sb;
var LOGGED_USER;
var CHANNEL_LIST;
var SELECTED_CHANNEL;
var MESSAGE_LIST;

function init() {
    APP_ID = document.getElementById('appId').value;
    USER_ID = document.getElementById('userId').value;
    ACCESS_TOKEN = document.getElementById('accessToken').value;
    if (!APP_ID || !USER_ID) {
        return;
    }
    sb = new SendBird({ appId: APP_ID, localCacheEnabled: true });   // The `localCacheEnabled` is optional.
    connect();
}

function connect() {
    sb.connect(USER_ID, ACCESS_TOKEN, (user, error) => {
        LOGGED_USER = user;
        showMainApp();
        listBroadcastChannels();
    })
}

function showMainApp() {
    document.getElementById('divMainApp').classList.remove('hidden');
    document.getElementById('divLogin').classList.add('hidden');
}

function listBroadcastChannels() {
    var listQuery = sb.GroupChannel.createMyGroupChannelListQuery();
    listQuery.includeEmpty = true;
    listQuery.limit = 100;
    if (listQuery.hasNext) {
        listQuery.next((groupChannels, error) => {
            console.log(groupChannels);
            CHANNEL_LIST = [];
            groupChannels.forEach(channel => {
                if (channel.isBroadcast) {
                    CHANNEL_LIST.push(channel);
                }
            });
            paintGroupChannels();
        });
    }
}

function paintGroupChannels() {
    let out = `<ul class="list-group">`;
    if (!CHANNEL_LIST || CHANNEL_LIST.length == 0) {
        out += `<li class="list-group-item">No broadcast channels to show.</li>`;
    } else {
        for (let channel of CHANNEL_LIST) {
            out += `<li class="list-group-item">&nbsp;
                <button class="btn btn-primary btn-sm" id="butChat-${ channel.url }" onclick="showChat('${ channel.url }')">
                    Chat
                </button> 
                ${ channel.name } 
            </li>`;
        }    
    }
    out += `</ul>`;
    document.getElementById('channelList').innerHTML = out;
}

function createBroadcastChannel() {
    const channelName = document.getElementById('channelName');
    const inviteUserId = document.getElementById('inviteUserId');
    const setAsAdmin = document.getElementById('setAsAdmin');
    if (!channelName.value || !inviteUserId.value) {
        return;
    }
    var params = new sb.GroupChannelParams();
    params.isBroadcast = true;
    params.addUserIds([ inviteUserId.value ]);
    if (setAsAdmin.checked) {
        params.operatorUserIds = [ USER_ID ];
    }
    params.name = channelName.value;
    sb.GroupChannel.createChannel(params, function (groupChannel, error) {
        if (!error) {
            SELECTED_CHANNEL = groupChannel;
            channelName.value = '';
            inviteUserId.value = '';
            setAsAdmin.checked =  false;
            listBroadcastChannels();
        }
    });
}

function showChat(channelUrl) {
    document.getElementById('divMainApp').classList.add('hidden');
    document.getElementById('divChat').classList.remove('hidden');
    // Get the channel from the given URL
    sb.GroupChannel.getChannel(channelUrl, (groupChannel, error) => {
        if (!error) {
            SELECTED_CHANNEL = groupChannel;
            showChatFromChannel(groupChannel);
            const loggedUserIsOperator = groupChannel.members ? groupChannel.members.findIndex(i => i.userId == USER_ID && i.role == 'operator') > -1 : false;
            if (loggedUserIsOperator) {
                document.getElementById('divChatFooter').classList.remove('hidden');
                document.getElementById('divChatFooterNotOperators').classList.add('hidden');
            } else {
                document.getElementById('divChatFooter').classList.add('hidden');
                document.getElementById('divChatFooterNotOperators').classList.remove('hidden');
            }
        }
    })
}

function showChatFromChannel(groupChannel) {
    var listQuery = groupChannel.createPreviousMessageListQuery();
    listQuery.limit = 50;
    listQuery.includeMetaArray = true;  // Retrieve a list of messages along with their metaarrays.
    listQuery.includeReaction = true;   // Retrieve a list of messages along with their reactions.
    listQuery.load(function(messages, error) {
        MESSAGE_LIST = messages;
        drawMessages();
    });
}

function drawMessages() {
    let out = `<ul class="list-group">`;
    if (!MESSAGE_LIST || MESSAGE_LIST.length == 0) {
        out += `<li class="list-group-item">No messages.</li>`;
    } else {
        for (let msg of MESSAGE_LIST) {
            out += `<li class="list-group-item">
                ${ msg.message }
                <div class="small text-muted">
                    Sent by: ${ msg.sender ? msg.sender.nickname ? msg.sender.nickname : msg.sender.userId : 'Admin' }
                </div>
            </li>`;
        }    
    }
    out += `</ul>`;
    document.getElementById('messageList').innerHTML = out;
}

function sendMessage() {
    const newMessage = document.getElementById('newMessage');
    if (!newMessage.value || !SELECTED_CHANNEL) {
        return;
    }
    const params = new sb.UserMessageParams();
    params.message = newMessage.value;
    SELECTED_CHANNEL.sendUserMessage(params, function(userMessage, error) {
        if (!error) {
            newMessage.value = '';
            showChatFromChannel(SELECTED_CHANNEL);
        }
    });
}

function showAnyway() {
    document.getElementById('divChatFooter').classList.remove('hidden');
    document.getElementById('divChatFooterNotOperators').classList.add('hidden');
}

document.getElementById('butConnect').addEventListener('click', init);
document.getElementById('butCreateChannel').addEventListener('click', createBroadcastChannel);
document.getElementById('btnSendMessage').addEventListener('click', sendMessage);
document.getElementById('btnShowAnyway').addEventListener('click', showAnyway);
