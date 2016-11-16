# Amazon Inventory Scraper
===================
#### Why open source this
I am in the process of open sourcing multiple of my projects/libraries that might be of help for other developers.

#### What does this package/lib do
It was coded with the aim to spy/scrape amz products' inventories and help users/merchants come up with new sourcing ideas.


#### Get started
```
npm install amz-spy
```

#### Available methods

###### scrapeAmazonProductPage(requestObject)
This method returns a promise and must be used before getAmazonInventory Info


###### getAmazonInventoryInfo(requestParams, productInfo)
This method returns a promise and needs to be called after scrapeAmazonProductPage

Example :

```javascript
const amzSpy = require('amz-spy')

const requestObject = {
	url : 'THE PRODUCT URL',
    method : 'GET',
    encoding : 'binary',
    timeout : 20000,
    proxy : 'YOUR PROXY or null',
    createJar : true
}

amzSpy.scrapeAmazonProductPage(requestObject).then(data => {
	const postData = {
    	url : data.formUrl,
        form : data.postData,
        proxy : 'http://'+proxy.ip,
        method : 'POST',
        jar : data.cookieJar
    }
    //Also returns the product info
    const productInfo = {
      productPrice : data.productPrice,
      salesRank : data.salesRank,
      numReviews : data.numReviews,
      merchantId : data.merchantId,
    }
	return amazon.getAmazonInventoryInfo(requestParams, productInfo);
}).then(data => {
	//Info returned by getAmazonInventoryInfo
    const result{
    	date,
    	inventory,
        price,
        sales_rank,
        merchant_id,
        num_reviews
    } = data
    console.log(result)
}).catch(err => {
  console.log(err)
})


```

##### Error handling

If an error occurs the functions will return errors in an Object Format {error : 'Error type'}
This section will be completed ASAP

##### Responsabililites
I am not responsible for how you use this library. You have to respect the rules written by Amazon
