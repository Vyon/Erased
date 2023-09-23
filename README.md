# Erased
I am lazy and so are you!

This bot will routinely check for new messages that may or may not contain right to erasure requests. If an erasure request is picked up by the bot, it will attempt to delete the users information from any data stores it has access to.

###### NOTE: THIS WILL NOT DELETE ANY STORED DATA IF IT DOES NOT HAVE ACCESS TO THE PLACE TO GIVE ACCESS FOLLOW THIS [GUIDE](https://create.roblox.com/docs/cloud/open-cloud/managing-api-keys)

## Required APIKey Permissions
- Ordered Datastores
  - Read / Write
- Data Store
  - Read Entry
  - Delete Entry
  - List Entry Keys
  - List Datastores

## Adding IP addresses
Fortunately Roblox has a bit of security when it comes to who can make requests with your APIKey. Roblox requires your public IP address which you can find by simply searching ["What is my ip address?"](https://duckduckgo.com/?t=h_&q=what+is+my+ip&) and add it under the "Security" tab

## Configuration
You are also going to need to change the `example.config.json` file so it has the information it needs to run. You can do this by renaming the file to `config.json` and filling in the information as such.

```json
{
	// From what I have seen all erasure requests have the same subject
	"ErasureSubject": "[IMPORTANT] Right to Erasure - Action Requested",

	// The interval in seconds to check for new messages
	"Interval": 60,

	// If you want to include requests that were sent prior to the bot being started
	"IncludeOldRequests": false,

	// The APIKey which is used to remove information from datastores
	"APIKey": "",

	// The cookie which is used to manage messages & get universe ids from place ids.
	"Cookie": ""
}
```

## Side notes
This has not been battle tested and may have some bugs that have not been accounted for. If you find any bugs please report them in the issues tab and please provide as much information as possible.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details