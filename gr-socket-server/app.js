var server = require('http').createServer(handler)
  , io = require('socket.io').listen(server, {transports:['flashsocket', 'websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling'] })
  , fs = require('fs')
  , sys = require("sys")
  , users = new Array()				//stores socket clients identified by the client ID hash
  , operators = new Array();		//stores socket client IDs per conversation -- all users(Guest/VIP) associated with the operator. 
									//eg operators[<op_client_id>]= [<vip_client_id>,<guest_client_id>]

server.listen(80);

function handler (req, res) 
{
  console.log("Request handler for: " + req.url);
  var filePath = __dirname + req.url;
  if (req.url=="/") {
	  filePath = __dirname + '/crossdomain.xml';
  }

  //server the cross domain file when the server starts
  fs.readFile(filePath,
	function (err, data) 
	{
    	if (err) {
       		res.writeHead(500);
       		return res.end('Error loading file');
     	}

  	 	res.setHeader('Content-Type', 'application/xml');
     	res.writeHead(200);
     	res.end(data);
   });
}

io.sockets.on('connection', function (client) 
{
	io.set('heartbeat interval', 10);
    users[client.id] = client;
	//socket.emit('connection', { id: socket.id  }); 

  	//send node client conn_id to the client 
  	client.send( JSON.stringify({event:"connection_established", client_id:client.id}) );

  	client.on('eventFromFlex', function (data) 
	{
		sys.log('eventFromFlex with data:');
    	sys.log(data);
    	//client.emit('news', { hello: 'world!!!', id: socket.id });

		//client.send({type:"operator_ping", operator_client_id: peerID},"eventFromFlex");
		if(users.hasOwnProperty(data.dest_client_id) )			//make sure message destination is specified
		{
			sys.log("Sending message from " + client.id +" - to " + data.dest_client_id );
			switch(data.event) 
			{
				case('operator_assistance_request'): //case('guest_assistance_request'):
				case('ping_response'):
				case('notification'):
				case('chat_message'):
					users[data.dest_client_id].send( JSON.stringify({event: data.event, message: data.message, requester_id: client.id}) );
					//client.send( JSON.stringify( {event: 'ping_response', requester_id: client.id}) );
					break;
				case('operator_instruction'):
					if(data.hasOwnProperty('timeRemaining'))
						users[data.dest_client_id].send( JSON.stringify({event: data.event, instruction: data.instruction, timeRemaining: data.timeRemaining, requester_id: client.id}) );
					else 
						users[data.dest_client_id].send( JSON.stringify({event: data.event, instruction: data.instruction, requester_id: client.id}) );
					
					break;
				case('ping_operator'):
				
					//store the client id for operator
					if( !operators.hasOwnProperty(data.dest_client_id) ) {
					 	operators[data.dest_client_id] = new Array();
					}
					operators[data.dest_client_id].push(client.id);
				
					sys.log("Number of operators connected:" + operators.length);
					users[data.dest_client_id].send( JSON.stringify({event: data.event, message: data.message, requester_id: client.id}) );
					break;
				default: break;	
			}
		
		} 
		else 
		{
			users[client.id].send( JSON.stringify({event: 'client_not_found', message: '' , requester_id: client.id}) );
		}
		
  	});

	client.on('disconnect', function (s) 
	{
		sys.log("Client disconnected!");		
		
		//if this is operator client, notify all associated clients that the operator has exited
		if( operators.hasOwnProperty(client.id) ) 
		{
			for( var i=0; i < operators[client.id].length; i++ ) 
			{
				if( users.hasOwnProperty(operators[client.id][i]) )
					users[operators[client.id][i]].send( JSON.stringify( {event: 'operator_exit', message: '', requester_id: client.id} ) );
			}
			delete operators[client.id];
		}
		
		//remove the client from the user array
		delete users[client.id];
	});
});




// ****************************************************************************
// Security Policy server for flash
// serve the crossdomain file for flashplayer on port 843 on a separate server
// ****************************************************************************
// var net = require("net")
//   , policyServer = net.createServer( policyFileHandler )
//   , domains = ["*:*"];
//  
// function policyFileHandler(socket) 
// {
// 	require("sys").log("LOADING Policy");
// 	var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM' + 
// 	            ' "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">\n<cross-domain-policy>\n';
// 	    xml += '<allow-access-from domain="*" to-ports="*"/>\n';
// 		// domains.forEach(
// 		//     function(domain) {
// 		//         var parts = domain.split(':'); 
// 		// 
// 		//         //Write them to the socket
// 		//         xml += "<allow-access-from domain=\""+parts[0]+"\" to-ports=\""+(parts[1]||'80')+"\"/>\n";
// 		// });
// 	
// 	      xml += '</cross-domain-policy>\n';
//    	socket.setEncoding('utf8');
//    	socket.write(xml);
// 	sys.log("Wrote policy file.");
// 	socket.end();
// }
// policyServer.listen(843);


var pf = require('policyfile').createServer();
pf.listen(843, function(){
  console.log('Loading socket policy')
});