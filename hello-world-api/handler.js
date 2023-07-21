// handler.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

module.exports.hello = async (event) => {
  const body = JSON.parse(event.body)
  const name = body.name;
  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello ${name}!` }),
  };
  return response;
};

module.exports.reportBin = async (event) => {
  const requestBody = JSON.parse(event.body);

  const user_id = requestBody.user_id || null;
  const username = requestBody.username || null;
  const current_location = requestBody.current_location || null;
  const timestamp = requestBody.timestamp || null;
  const report_type = requestBody.report_type || null;
  const message = requestBody.message || null;

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      user_id,
      username,
      current_location,
      timestamp,
      report_type,
      message,
    }),
  };

  // Save the response data in DynamoDB
  const params = {
    TableName: 'reportBinDB',
    Item: {
      user_id,
      username,
      current_location,
      timestamp,
      report_type,
      message,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log('Data saved in DynamoDB:', params.Item);
  } catch (error) {
    console.error('Error saving data in DynamoDB:', error);
  }

  return response;
};

module.exports.driver = async (event) => {
  const requestBody = JSON.parse(event.body);

  const user_id = requestBody.user_id || null;
  const location = requestBody.location || null;
  const garbageCollected = requestBody.garbageCollected || false;

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      user_id,
      location,
      garbageCollected,
    }),
  };

  // Save the response data in DynamoDB
  const params = {
    TableName: 'driverDB',
    Item: {
      user_id,
      location,
      garbageCollected,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log('Data saved in DynamoDB:', params.Item);
  } catch (error) {
    console.error('Error saving data in DynamoDB:', error);
  }

  return response;
};

module.exports.imageUpload = async (event) => {
  const imageFile = event.body; // Assuming you are sending the image file in the request body

  if (!imageFile) {
    const response = {
      statusCode: 400,
      body: JSON.stringify({ message: 'Image file not provided.' }),
    };
    return response;
  }

  // Set a unique key for the S3 object based on timestamp and a random string
  const s3Key = `images/${Date.now()}-${Math.random().toString(36).substring(2)}`;

  // Upload the image to S3
  try {
    const params = {
      Bucket: 'project-navik', // Replace 'YourS3BucketName' with your actual S3 bucket name
      Key: s3Key,
      Body: imageFile,
      ContentType: 'image/jpeg', // Update the content type based on your image file format
    };

    await s3.upload(params).promise();

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image uploaded successfully.' }),
    };
    return response;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error uploading image to S3.' }),
    };
    return response;
  }
};


module.exports.uploadData = async (event) => {
  const formData = parseFormData(event.body);

  // Get other fields from the FormData
  const user_id = formData.get('user_id') || null;
  const username = formData.get('username') || null;
  const current_location = formData.get('current_location') || null;
  const report_type = formData.get('report_type') || null;
  const message = formData.get('message') || null;

  // Get the image file from the FormData
  const imageFile = formData.get('image');

  // Set a unique key for the S3 object based on timestamp and a random string
  const s3Key = `images/${Date.now()}-${Math.random().toString(36).substring(2)}`;

  // Upload the image to S3
  try {
    await s3
      .upload({
        Bucket: 'project-navik', // Replace 'YourS3BucketName' with your actual S3 bucket name
        Key: s3Key,
        Body: imageFile,
        ContentType: imageFile.type, // Set the content type based on the image file type
      })
      .promise();

    // Generate the S3 URL for the uploaded image
    const imageUrl = `https://YourS3BucketName.s3.amazonaws.com/${s3Key}`;

    // Save the data in DynamoDB
    const params = {
      TableName: 'driverDB', // Replace 'YourDynamoDBTableName' with your actual DynamoDB table name
      Item: {
        user_id,
        username,
        current_location,
        timestamp: Date.now(), // You can set the timestamp here or use the S3 object creation time
        report_type,
        message,
        imageUrl,
      },
    };

    await dynamoDB.put(params).promise();

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data uploaded successfully.' }),
    };
    return response;
  } catch (error) {
    console.error('Error uploading image or saving data:', error);
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error uploading image or saving data.' }),
    };
    return response;
  }
};

function parseFormData(formDataStr) {
  // console.log(formDataStr)
  const entries = formDataStr.split('&');
  const formData = new Map();

  for (const entry of entries) {
    const [key, value] = entry.split('=');
    console.log("===?>.", key, value)
    formData.set(decodeURIComponent(key), decodeURIComponent(value)); // Decode both key and value
  }

  return formData;
}




const formidable = require('formidable');

AWS.config.update({ region: 'ap-south-1' }); // Replace with your desired AWS region


module.exports.storeImageInS3 = async (event, context, callback) => {
  const requestBody = JSON.parse(event.body);

  // Extract the base64-encoded image data from the 'image' field in FormData
  const imageBase64Data = requestBody.body.match(/base64,(.*)$/)[1];
  const imageFile = Buffer.from(imageBase64Data, 'base64');

  const s3Key = `images/${Date.now()}-image.jpg`; // Change 'image.jpg' to the appropriate file extension

  const params = {
    Bucket: 'project-navik', // Replace with your actual S3 bucket name
    Key: s3Key,
    Body: imageFile,
    ContentType: 'image/jpeg', // Replace with the appropriate content type if not JPEG
  };

  try {
    const data = await s3.upload(params).promise();

    const response = {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: data.Location }),
    };
    return response;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error uploading image to S3.' }),
    };
    return response;
  }
};


