# 2023S CS 546-WS Final Project: Hotel Management System Web Application#
## Group 47 ##
### Group Member ###
Jichen Jiang,  
Varun Reddy Pedditi,  
Zihe Wang,  
Linghao Zhao  

The final project involves creating a complete web application for Hotel Management System using HTML, CSS, Express, Node.js, MongoDB, client-side JavaScript, security measures, accessibility, and user authentication.

## SetUp ##
Run the 'npm install' to download all dependencies of package.json  

`npm install`  

Then run 'npm run seed' to run seed.js and make generate random initial data to Mongodb.  

`npm run seed`  

Finally, run npm start to run the application and access routes at <http://localhost:3000>  

`npm start`  

## Project Process ##
There will be a search form on the home page for searching the hotel. Enter relevant information and click Search to get the hotel search results. Click the hotel name to enter the detail page of the hotel, which will display the basic information, reviews and room types of the hotel. If you are not a registered user and are not logged in, you will not be able to do any further operations
### Register & Login ###
- Click Register to enter the registration page and enter your personal information to complete the registration. Note: the avatar requires an image, and there are some instances stored in `/public/img`.  
- Click Login to go to the login page and enter the user name and password. If login is successful, homepage (index) will be returned.    
### User ###
You can log in as user using the following information:  

`Username: Userone`  
`Password: Userone1!`  

- As with unauthenticated users, search for hotels and go to the hotel details page and enter the checkin date and checkout date to search for available room types. Then, select the room type to complete the booking.  
- Click Dashboard and go to the individual page, which displays basic user information, and edit user information, change passwords, view user orders, create request and log out.  
- Users can review (rate and comment) orders and can change and delete them. Note: Users who have already reviewed cannot repeat their comments. Users can either approve or disapprove any review by clicking 'Upvote' or 'Downvote' on any review.  
- Create request: The user can apply to admin to register a new hotel and become the manager, fill in the hotel information and submit, and wait for admin's approval.  
  
Both manager and admin can perform the functions of User.  
### Manager ###
You can log in as manager using the following information:  

`Username: Managerone`  
`Password: Managerone1!`  

- Dashboard page of Manager will add a "My Hotel" option. Click it and enter the hotel management page of the hotel it belongs to.
- The hotel management page will display and edit the basic information of the hotel. It also manages rooms, room types, orders, reviews and managers. Note: manager cannot delete hotel.  
- Rooms: List all the rooms and can be modified or deleted for each room. Different room types can also be added.  
- Room types: List all room types, and you can change or delete each room type, as well as add different room types.  
- Orders: Search for the details of an order by its ID and delete the order.  
- Reviews: Show the reviews list. Manager can only browse the information of his own hotel, and cannot add, modify or delete.  
- The managers page lists the details of each manager, and you can delete and add manager.  
### Admin ###
You can log in as admin using the following information:  

`Username: admin`  
`Password: Group47admin1!`  

- Admin's Dashboard will have an additional Admin portal to manage requests and Accounts:  
  - Requests: If the request is approved, a new hotel will be created based on the request information, and the applicant will be upgraded to manager with the order status being 'approval'; If it is rejected, the order status changes to 'reject '.
  - Accounts: You can search for users based on their username, modify and delete them, and create new users.
  - Orders: You can search order with order ID, and delete it.
- When Admin searches for a hotel (/hotel/:hotelID) through the home page, there will be an external link to hotel management page for this hotel, which could manage each hotel as a manager. In addition, admin could delete hotel.