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
	//The method returns the necessary data for the inventory scraping
    const requestParams = {
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
      merchantId : data.merchantId
    }

    //We call the inventory scraping method with the data obtained via the scrapeAmazonProductPage
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
})
