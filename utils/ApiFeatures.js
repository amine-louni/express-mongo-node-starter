/*
 * This class is responsible for sorting & filtering & selecting & paginate
 * Each method return this to enable chaining
 */

class ApiFeatures {
  //BUILDING THE QUERY
  constructor(mongoQuery, queryString) {
    this.mongoQuery = mongoQuery;
    this.queryString = queryString;
  }

  filter() {
    // 1 - A ) Basic Filtering
    const queryObj = { ...this.queryString };
    const excludes = ['sort', 'limit', 'fields', 'page'];
    excludes.forEach((el) => delete queryObj[el]);

    // 1 - B ) Advanced Filtering with (gt,lt, gte,lte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(lte|gte|lt|gt)\b/g, (match) => `$${match}`);
    this.mongoQuery = this.mongoQuery.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    //  2 ) Sorting
    if (this.queryString.sort) {
      this.mongoQuery = this.mongoQuery.sort(
        this.queryString.sort.split(',').join(' ')
      );
    } else {
      this.mongoQuery = this.mongoQuery.sort('-createdAt');
    }

    return this;
  }

  selectFields() {
    // 3 ) Selecting Fields
    if (this.queryString.fields) {
      this.mongoQuery = this.mongoQuery.select(
        this.queryString.fields.split(',').join(' ')
      );
    } else {
      this.mongoQuery = this.mongoQuery.select('-__v');
    }

    return this;
  }

  paginate() {
    // 4 ) Pagination | query.skip(int).limit(int)
    const limit = this.queryString.limit * 1 || 100;
    const page = this.queryString.page * 1 || 1;
    const skips = (page - 1) * limit;
    this.mongoQuery = this.mongoQuery.skip(skips).limit(limit);

    return this;
  }
}

module.exports = ApiFeatures;
