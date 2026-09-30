package com.getfocused.matabishi.controller;

import com.getfocused.matabishi.model.Article;
import com.getfocused.matabishi.repository.ArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
public class ArticleController {
    private final ArticleRepository articleRepository;

    @PostMapping
    public Article create(@RequestBody Article article) {
        return articleRepository.save(article);
    }

    @GetMapping
    public List<Article> getAll() {
        return articleRepository.findAll();
    }
}