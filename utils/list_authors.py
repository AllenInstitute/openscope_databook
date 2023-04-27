import os
import subprocess

blacklist = {"Publishing Bot", "github-actions[bot]", "Ross Carter Peene"}
additional_authors = ["Josh Siegle"]

# a function that inserts text into a markdown file
def insertAuthors(filename, placeholder_start, placeholder_end, authors):
	with open(filename, "r") as md:
		lines = md.read().splitlines()
		
	insert_start, insert_end = None, None
	for i in range(len(lines)):
		if placeholder_start in lines[i] and insert_start == None:
			insert_start = i
		if placeholder_end in lines[i] and insert_start != None:
			insert_end = i
			break

	if insert_start != None and insert_end != None:
		lines[insert_start+1:insert_end] = ["#### " + ", ".join(authors)]

	with open("./docs/intro.md", "w") as md:
		md.write("\n".join(lines))

def getContributors():
	log = subprocess.Popen(["git", "log"], stdout=subprocess.PIPE, text=True)
	shortlog = subprocess.check_output(["git", "shortlog", "-sn"], stdin=log.stdout, encoding="utf8")
	print(shortlog)
	contributions = shortlog.split("\n")[:-1]
	return {contribution.split("\t")[1] for contribution in contributions}

def main():
	contributors = getContributors()
	authors = contributors - blacklist
	authors = list(authors) + additional_authors
	print("Authors:", authors)
	insertAuthors("./docs/intro.md", "<!-- authors start -->", "<!-- authors end -->", authors)

main()
