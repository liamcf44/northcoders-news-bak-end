process.env.NODE_ENV = 'test';

const app = require('../app');
const { expect } = require('chai');
const request = require('supertest')(app);
const mongoose = require('mongoose');
const seedDB = require('../seed/seed');

const {
  topicData,
  userData,
  articleData,
  commentData
} = require('../seed/testData');

describe('/api', () => {
  let topicDocs, userDocs, articleDocs;
  beforeEach(() => {
    return seedDB(topicData, userData, articleData, commentData).then(docs => {
      [topicDocs, userDocs, articleDocs, commentDocs] = docs;
    });
  });
  after(() => {
    return mongoose.disconnect();
  });
  describe('Seed Database', () => {
    it('The database should seed the topics correctly', () => {
      expect(topicDocs.length).to.equal(2);
      expect(topicDocs[0]).to.be.an('object');
      expect(topicDocs[0].title).to.equal('Mitch');
    });
    it('The database should seed the users correctly', () => {
      expect(userDocs.length).to.equal(2);
      expect(userDocs[0]).to.be.an('object');
      expect(userDocs[1].username).to.equal('dedekind561');
    });
    it('The database should seed the articles correctly', () => {
      expect(articleDocs.length).to.equal(4);
      expect(articleDocs[0]).to.be.an('object');
      expect(articleDocs[2].title).to.equal(
        "They're not exactly dogs, are they?"
      );
    });
    it('The database should seed the comments correctly', () => {
      expect(commentDocs.length).to.equal(8);
      expect(commentDocs[4]).to.be.an('object');
      expect(commentDocs[2].body).to.equal('The owls are not what they seem.');
    });
  });
  describe('/*', () => {
    it('GET on a non-existent route returns a 404 status and an error code', () => {
      return request
        .get('/api/topicswrongendpoint')
        .expect(404)
        .then(({ body }) => {
          expect(body.message).to.equal('404: Page not found');
        });
    });
  });
  describe('/topics', () => {
    it('GET returns a 200 status and all the topics', () => {
      return request
        .get('/api/topics')
        .expect(200)
        .then(({ body }) => {
          expect(body.topics[0].slug).to.equal('mitch');
          expect(body.topics[1].title).to.equal('Cats');
          expect(body.topics.length).to.equal(2);
        });
    });
    describe('/topics/:topic_id/articles', () => {
      it('GET returns a 200 status and all articles attached to a topic', () => {
        const [testTopic] = topicDocs;
        return request
          .get(`/api/topics/${testTopic._id}/articles`)
          .expect(200)
          .then(({ body }) => {
            expect(body.result[0]).to.be.an('object');
            expect(body.result[0].title).to.equal(
              'Living in the shadow of a great man'
            );
            expect(body.result[1].belongs_to._id).to.equal(`${testTopic._id}`);
          });
      });
      it('ERROR: GET with an valid database id but not a valid topic id returns a 404 status and an error message', () => {
        const [incorrectTest] = userDocs;
        return request
          .get(`/api/topics/${incorrectTest._id}/articles`)
          .expect(404)
          .then(({ body }) => {
            expect(body.message).to.equal('404: Page not found');
          });
      });
      it('ERROR: GET with an invalid Id / CastError returns a 400 status and an error message', () => {
        const [testTopic] = topicDocs;
        return request
          .get(`/api/topics/${testTopic._id}wrong/articles`)
          .expect(400)
          .then(({ body }) => {
            expect(body.message).to.equal('400: Bad Request');
          });
      });
      it('POST returns a 201 status and the article posted', () => {
        const [testTopic] = topicDocs;
        const [testUser] = userDocs;
        let testArticle = {
          title: 'This is a test article',
          body: 'This is a test body',
          belongs_to: `${testTopic._id}`,
          votes: 44,
          created_by: `${testUser._id}`
        };
        return request
          .post(`/api/topics/${testTopic._id}/articles`)
          .send(testArticle)
          .expect(201)
          .then(({ body }) => {
            expect(body.newArticleDoc).to.be.an('object');
            expect(body.newArticleDoc.title).to.equal('This is a test article');
            expect(body.newArticleDoc.created_by).to.equal(`${testUser._id}`);
          });
      });
      it('ERROR: POST returns a 400 status and an error message', () => {
        const [testTopic] = topicDocs;
        const [testUser] = userDocs;
        let testArticle = {
          title: 'This is a test article',
          body: 'This is a test body',
          votes: 44,
          created_by: `${testUser._id}44`
        };
        return request
          .post(`/api/topics/${testTopic._id}/articles`)
          .send(testArticle)
          .expect(400)
          .then(({ body }) => {
            expect(body.message).to.equal('400: Bad Request');
          });
      });
    });
  });
  describe('/articles', () => {
    it('GET returns a 200 status and all the articles', () => {
      return request
        .get('/api/articles')
        .expect(200)
        .then(({ body }) => {
          expect(body.articles.length).to.equal(4);
          expect(body.articles[3].title).to.equal(
            'UNCOVERED: catspiracy to bring down democracy'
          );
        });
    });
    describe('/articles/:article_id', () => {
      it('GET returns a 200 status and the relevant article', () => {
        const [testArticle] = articleDocs;
        return request
          .get(`/api/articles/${testArticle._id}`)
          .expect(200)
          .then(({ body }) => {
            expect(body.result[0].body).to.equal(
              'I find this existence challenging'
            );
            expect(body.result[0]._id).to.equal(`${testArticle._id}`);
          });
      });
      it('ERROR: GET with an valid database id but not a valid article id returns a 404 status and an error message', () => {
        const [incorrectTest] = userDocs;
        return request
          .get(`/api/articles/${incorrectTest._id}`)
          .expect(404)
          .then(({ body }) => {
            expect(body.message).to.equal('404: Page not found');
          });
      });
      it('ERROR: GET with an invalid Id / CastError returns a 400 status and an error message', () => {
        const [testArticle] = articleDocs;
        return request
          .get(`/api/topics/${testArticle._id}wrong/articles`)
          .expect(400)
          .then(({ body }) => {
            expect(body.message).to.equal('400: Bad Request');
          });
      });
      it('PUT with a query of vote=up returns a 200 status and increases the article votes by 1', () => {
        const [testArticle] = articleDocs;
        return request
          .put(`/api/articles/${testArticle._id}?vote=up`)
          .expect(200)
          .then(({ body }) => {
            expect(body.result._id).to.equal(`${testArticle._id}`);
            expect(body.result.votes).to.equal(1);
            return request.put(`/api/articles/${testArticle._id}?vote=up`);
          })
          .then(({ body }) => {
            expect(body.result.votes).to.equal(2);
          });
      });
      it('PUT with a query of vote=down returns a 200 status and decreases the article votes by 1', () => {
        const [testArticle] = articleDocs;
        return request
          .put(`/api/articles/${testArticle._id}?vote=down`)
          .expect(200)
          .then(({ body }) => {
            expect(body.result._id).to.equal(`${testArticle._id}`);
            expect(body.result.votes).to.equal(-1);
          });
      });
      it('PUT with anything other than up or down does not change the votecount', () => {
        const [testArticle] = articleDocs;
        return request
          .get(`/api/articles/${testArticle._id}?vote=sideways`)
          .then(({ body }) => {
            expect(testArticle.votes).to.equal(0);
          });
      });
      describe('/articles/:article_id/comments', () => {
        it('GET returns a 200 status and the relevant comments by article ID', () => {
          const [testArticle] = articleDocs;
          return request
            .get(`/api/articles/${testArticle._id}/comments`)
            .expect(200)
            .then(({ body }) => {
              expect(body.comments[0]).to.be.an('object');
              expect(body.comments[0].belongs_to._id).to.equal(
                `${testArticle._id}`
              );
            });
        });
        it('ERROR: GET with an valid database id but not a valid article id returns a 404 status and an error message', () => {
          const [incorrectTest] = userDocs;
          return request
            .get(`/api/articles/${incorrectTest._id}/comments`)
            .expect(404)
            .then(({ body }) => {
              expect(body.message).to.equal('404: Page not found');
            });
        });
        it('ERROR: GET with an invalid Id / CastError returns a 400 status and an error message', () => {
          const [testArticle] = articleDocs;
          return request
            .get(`/api/articles/${testArticle._id}wrong/comments`)
            .expect(400)
            .then(({ body }) => {
              expect(body.message).to.equal('400: Bad Request');
            });
        });
        it('POST returns a 201 status and the article posted', () => {
          const [testArticle] = articleDocs;
          const [testUser] = userDocs;
          let testComment = {
            body: 'This is a test comment',
            belongs_to: `${testArticle._id}`,
            created_at: 44444444444444,
            votes: 44,
            created_by: `${testUser._id}`
          };
          return request
            .post(`/api/articles/${testArticle._id}/comments`)
            .send(testComment)
            .expect(201)
            .then(({ body }) => {
              expect(body.newCommentDoc).to.be.an('object');
              expect(body.newCommentDoc.body).to.equal(
                'This is a test comment'
              );
              expect(body.newCommentDoc.created_by).to.equal(`${testUser._id}`);
              expect(body.newCommentDoc.belongs_to).to.equal(
                `${testArticle._id}`
              );
            });
        });
        it('ERROR: POST returns a 400 status and an error message', () => {
          const [testArticle] = articleDocs;
          const [testUser] = userDocs;
          let testComment = {
            body: 'This is a test comment',
            belongs_to: `${testArticle._id}incorrect`,
            created_at: 44444444444444,
            votes: 44,
            created_by: `${testUser._id}wrong`
          };
          return request
            .post(`/api/articles/${testArticle._id}/comments`)
            .send(testComment)
            .expect(400)
            .then(({ body }) => {
              expect(body.message).to.equal('400: Bad Request');
            });
        });
      });
    });
  });
  describe('/comments/:comment_id', () => {
    it('PUT with a query of vote=up returns a 200 status and increases the comment votes by 1', () => {
      const [testComment] = commentDocs;
      return request
        .put(`/api/comments/${testComment._id}?vote=up`)
        .expect(200)
        .then(({ body }) => {
          expect(body.result._id).to.equal(`${testComment._id}`);
          expect(body.result.votes).to.equal(8);
        });
    });
    it('PUT with a query of vote=down returns a 200 status and decreases the article votes by 1', () => {
      const [testComment] = commentDocs;
      return request
        .put(`/api/comments/${testComment._id}?vote=down`)
        .expect(200)
        .then(({ body }) => {
          expect(body.result._id).to.equal(`${testComment._id}`);
          expect(body.result.votes).to.equal(6);
        });
    });
    it('PUT with a query of anything other does not change the votecount', () => {
      const [testComment] = commentDocs;
      return request
        .get(`/api/comments/${testComment._id}?vote=sideways`)
        .then(({ body }) => {
          expect(testComment.votes).to.equal(7);
        });
    });
    it('DELETE removes comment by id and returns a message', () => {
      const [testComment] = commentDocs;
      return request
        .delete(`/api/comments/${testComment._id}`)
        .then(({ body }) => {
          expect(body.message).to.equal(
            `Comment ${testComment._id} has been deleted`
          );
        });
    });
    it('ERROR: DELETE with a valid Id but not a comment Id returns a 404 status and an error message', () => {
      const [testComment] = userDocs;
      return request
        .delete(`/api/comments/${testComment._id}`)
        .expect(404)
        .then(({ body }) => {
          expect(body.message).to.equal('404: Page not found');
        });
    });
  });
  describe('/users/:user_id', () => {
    it('GET returns a 200 status and the user details', () => {
      const [testUser] = userDocs;
      return request
        .get(`/api/users/${testUser.username}`)
        .expect(200)
        .then(({ body }) => {
          expect(body.result[0].username).to.equal(`${testUser.username}`);
          expect(body.result[0].name).to.equal('jonny');
          expect(body.result[0].username).to.equal('butter_bridge');
        });
    });
    it('ERROR:GET with an valid database id but not a valid article id returns a 404 status and an error message', () => {
      const [incorrectTest] = topicDocs;
      return request
        .get(`/api/users/${incorrectTest.username}`)
        .expect(404)
        .then(({ body }) => {
          expect(body.message).to.equal('404: Page not found');
        });
    });
    it('ERROR: GET with an invalid Id / CastError returns a 404 status and an error message', () => {
      const [testUser] = userDocs;
      return request
        .get(`/api/users/${testUser.username}wrong`)
        .expect(404)
        .then(({ body }) => {
          expect(body.message).to.equal('404: Page not found');
        });
    });
  });
});
