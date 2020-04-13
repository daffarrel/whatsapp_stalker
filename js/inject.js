class Log{
	static logs=[];

	static push(str){
		Log.logs.push(str);

		if(Log.logs.length>0){
			Log.flush();
		}
	}

	static flush(){
		console.log(Log.logs.join("\n"));
		Log.logs=[];
	}
}

class Stalker{
	constructor(){
		this.contacts=[];
		this.stalking=false;
	}

	addContact(contactName){
		if(this.contacts.indexOf(contactName)==-1){
			let contact=new Contact(contactName);
			this.contacts.push(contact);
		}
	}

	addContacts(contacts){
		contacts.forEach((contact)=>{
			this.addContact(contact)
		});
	}

	hasContacts(){
		return this.contacts.length > 0;
	}

	startStalking(){
		this.stalking=true;
		Log.push("Started stalking!");

		// this.contacts.forEach((contact)=>{
			this.contacts[0].open();
		// });
	}

	stop(){
		this.stalking=false;
	}

	askContactsToStalk(){
		let names = prompt("Enter the ,(coma) separated users you would like to monitor(No spaces)");

		if(names===null || !names.length){
			this.displayError("Invalid users selected!");
			return;
		}

		names=names.split(',');

		this.addContacts(names);
	}

	displayError(str){
		alert(str);
	}
}

class Contact{
	constructor(name){
		this.name=name;
	}

	async open(){
		Log.push(`Opening ${this.name}`);

		//first search for that contact
		uiManager.searchForContact(this);
		//check if contact is in search results, then click it
		let checkContactPresent = await uiManager.checkContactInSearch(this);
		if(!checkContactPresent){
			Log.push(`Contact:${this.name} not present in Contacts list`);
			return;
		}

		Log.push(`Contact:${this.name} is present in Contacts list, proceeding!`);
		
		await uiManager.clickContact(this);
		let status = await this.checkOnline();
		
		if(status){
			Log.push(`Contact: ${this.name} seems online!`);
		}
		else{
			Log.push(`Contact: ${this.name} seems offline!`);
		}
	}

	async checkOnline(){
		function checkOnlineUtil(){
			return new Promise((resolve)=>{
				//if the status has not been loaded yet, please wait for it by calling this function again in a small interval
				if($("#main").find("._315-i[title='click here for contact info']").length){
					setTimeout(async ()=>{
						resolve(await checkOnlineUtil());
					},200);
				}
				else{
					//We should wait for sometime here just so that if this status needs to be refreshed,
					//it gets refreshed by whatsapp
					setTimeout(()=>{
						let onlineSpan=$("#main").find("._315-i[title='online']").length,
							typingSpan=$("#main").find("._315-i[title='typing…']").length;
						resolve(onlineSpan || typingSpan);
					},500);
				}
			});
		}
		return await checkOnlineUtil();
	}
}

class UIManager{

	onLoad(){
		return new Promise((resolve)=>{
			if($("#side").length){
				Log.push("loaded");
				resolve();
			}
			else{
				Log.push('waiting to load');
				setTimeout(()=>{
					resolve(this.onLoad());
				},1000);
			}
		});
	}

	displayStalkerBtn(){
		//create a button that lets users start the monitoring
		let triggerBtn=document.createElement("div");
		triggerBtn.appendChild(document.createTextNode("Start Stalking!"));
		triggerBtn.classList.add("w_stalk_trigger_btn");
		triggerBtn.setAttribute('data-started',0);
		$(initBtnParent).append(triggerBtn).css("position","relative");
		
		//add a 'Stalk this contact button'
		var el=$("<div class='w_stalk_contact'>Stalk this person!</div>");
		$(".app").append(el);
	}

	searchForContact(contact){
		$(searchContactSelector).focus();
		window.InputEvent = window.Event || window.InputEvent;
		var event = new InputEvent('input', {bubbles: true});
		var textbox = $(searchContactSelector)[0];
		
		if(textbox){
			textbox.innerText = contact.name;
			textbox.dispatchEvent(event);
		}
	}

	//checks for a contact in the search results maxCounter Times with a small delay
	//if the contact is found before, it simply returns
	//if not found once, it recursively calls itself for a max num of maxCounter times.
	checkContactInSearch(contact){
		Log.push(`Checking ${contact.name} in search`);
		function checkContactUtil(currentCounter=0){

			return new Promise((resolve,reject)=>{
				let maxCounter=5;
				if(currentCounter>maxCounter){
					console.log(`Couldn't find ${contact.name} in the search results`);
					resolve(false);
				}

				let contactSpan=$("span[dir='auto'][title='"+contact.name+"']");

				if(contactSpan.length){
					resolve(true);
				}
				else{
					setTimeout(async ()=>{
						resolve(await checkContactUtil(currentCounter+1));
					},500);
				}
			})
		}
		return checkContactUtil();
		
	}
	clickContact(contact){
		return new Promise((resolve)=>{
			let contactSpan=$("span[dir='auto'][title='"+contact.name+"']");
			let mouseEvt= document.createEvent('MouseEvents');
			mouseEvt.initEvent('mousedown', true, true);
			contactSpan.parents(contactSelector)[0].dispatchEvent(mouseEvt);
			setTimeout(()=>{
				resolve();
			},200);
		});
	}
}



var stalker=new Stalker(),
	uiManager=new UIManager(),
	profiles=[],
	profiles_status=[],
	current_stalk_list=[],
	initBtnParent="._2umId",
	contactSelector="._2EXPL",
	searchContactSelector="._2S1VP",
	tick_timeout,
	stalk_btn_timeout,
	status_wait_time=500;	//the timeout in ms used in check_online()
jQuery(document).ready(async function($){
	await uiManager.onLoad();
	await uiManager.displayStalkerBtn();

	$("body").on("click",".w_stalk_trigger_btn",function(e){
		stalker.askContactsToStalk();
		
		setTimeout(()=>{
			if(stalker.hasContacts())
				stalker.startStalking();
		},1000)
	});

	$("body").on("mouseenter","._3NWy8",function(e){
		var left=$("#side").offset().left + $("#side").outerWidth(),
			top=$(this).offset().top + $(this).outerHeight()/2,
			contact_name=$(this).find("._1wjpf").first().text();

		$(".w_stalk_contact").css({
			left:left,
			top:top,
			opacity:1,
			pointerEvents:'all'
		}).html("Stalk <strong>"+contact_name+"</strong>!").attr("data-contact",contact_name);
		clearTimeout(stalk_btn_timeout);
	});

	$("body").on("mouseenter",".w_stalk_contact",function(e){
		clearTimeout(stalk_btn_timeout);
	});

	$("body").on("mouseleave","._3NWy8",function(e){
		clearTimeout(stalk_btn_timeout);
		stalk_btn_timeout=setTimeout(function(){
			hide_stalk_contact_btn();
		},100);
	});

	$("body").on("mouseleave",".w_stalk_contact",function(e){
		clearTimeout(stalk_btn_timeout);
		stalk_btn_timeout=setTimeout(function(){
			hide_stalk_contact_btn();
		},100);
	});

	$("body").on("click",".w_stalk_contact",function(e){
		var contact_name=$(this).attr("data-contact");
		if(current_stalk_list.indexOf(contact_name)==-1)
			current_stalk_list.push(contact_name);

	});
});

//tick function
function tick(){
	open_contact(window.cur_profile,function(){
		setTimeout(() => {
			var cur_time=new Date();
			if(check_online(function(online_status){
				if(online_status)
					console.log(cur_profile + " was online at "+cur_time);

				profiles_status.push({'name':cur_profile,'time':cur_time.getTime(),'status':online_status});

				//change the cur_profile to the next one in the list
				var i=profiles.indexOf(cur_profile),
					timeout=(i===profiles.length-1)?2000:200;
				cur_profile=(i===profiles.length-1)?profiles[0]:profiles[i+1];

				//if we have completed a cycle, send this info to our background script to do what it wants with it.
				if(i===profiles.length-1){
					chrome.runtime.sendMessage(profiles_status, function(response) {
						profiles_status=[];
					});
				}
				
				//if the user has clicked the 'stop stalking' button, let's stop!
				if($(".w_stalk_trigger_btn").attr("data-started")=="1")
					tick_timeout=setTimeout(tick,timeout);
			}));
		}, 100);
	});
}

// function hide_stalk_contact_btn(){
// 	$(".w_stalk_contact").css({
// 		opacity:0,
// 		pointerEvents:'none'
// 	});
// }